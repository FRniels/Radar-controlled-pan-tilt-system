// Object tracking info: https://nl.mathworks.com/help/radar/ug/track-objects-parking-lot-mmwaveradar-example.html
// DB scan:              https://www.geeksforgeeks.org/dbscan-clustering-in-ml-density-based-clustering/

#include <stdio.h>
#include <string.h>
#include <math.h>
#include "pico/stdlib.h"
#include "pico/binary_info.h"
#include "hardware/spi.h"

#define PIN_ONBOARD_LED 25

#define DEBUG_LED_INIT()        \
    gpio_init(PIN_ONBOARD_LED); \
    gpio_set_dir(PIN_ONBOARD_LED, GPIO_OUT)
#define DEBUG_LED_ON() gpio_put(PIN_ONBOARD_LED, 1)
#define DEBUG_LED_OFF() gpio_put(PIN_ONBOARD_LED, 0)

#define SPI_FREQUENCY (1000 * 1000) // 1MHz: Make sure the SPI frequency matches the TI IWR1642 SPI frequency
#define SPI_MAGIC_WORD_LEN 8        // The magic word is used for synchronizing the SPI communication with the TI IWR1642
#define BUF_LEN 0x0A                // Used for receiving the test data after the TI IWR1642 has initialised it's SPI => TO DO: THIS SHOULD BE REMOVED, ALSO FROM THE TI IWR1642 SIDE

#define TI_IWR1642_MAX_DETECTED_POINTS 255 // TO DO: RESEARCH WHAT THE ACTUAL NUMBER IS

#define DB_SCAN_MAX_CLUSTERS 255                                          // TO DO: TAKE THE MAX VALUE OF DETECTED OBJECTS AND TREAT THEM LIKE A WORST CASE SCENARIO IN WHICH => // TO DO: TAKE THE MAX VALUE OF DETECTED OBJECTS AND DIVIDE BY THE MIN POINTS NEEDED FOR A CLUSTER TO FORM
                                                                          //        EACH DETECTED OBJECT HAS IT'S OWN CLUSTER AND NO NEIGHBOURS
#define DB_SCAN_MIN_POINTS 3                                              // A minimum value of the quantity of dimensions in which the point lies (2D in this case) + 1 is recommended.
                                                                          // TO DO: FIND OUT THE NEEDED MIN POINTS LATER WHEN TESTING AS EACH ENVIRONMENT WILL CHANGE IN OPTIMAL MINIMUM POINTS
#define DB_SCAN_EPSILON_M 0.3F                                            // The radius of the circle around a detected point in which the neigbouring points need to lay to be a valid neighbour
                                                                          // TO DO: FIND OUT THE NEEDED RADIUS LATER WHEN TESTING AS EACH ENVIRONMENT WILL CHANGE IN OPTIMAL EPSILON
#define DB_SCAN_EPSILON_SQUARED_M (DB_SCAN_EPSILON_M * DB_SCAN_EPSILON_M) // Precompute to avoid an unnecessary pow() operation on runtime

// #define DB_SCAN_SILHOUETTE  // The silhouette is some kind of ratio between min points and epsilon. The optimal silhouette is application specific => TO DO: MORE RESEARCH

#define DB_SCAN_POINT_UNCLASSIFIED -1
#define DB_SCAN_POINT_NOISE 0

// TO DO: THESE SETTINGS NEED TO BE ENTERED OR RUNTIME ADJUSTED VIA A GUI BEFORE/WHILE THE RP PICO STARTS PROCESSING RADAR DATA
#define TRACKING_TARGET_START_WINDOW_SIZE 8 // Size in bits: 8 to 31
// A uint32_t is used for the sliding window so prevent shifting by 32 which is illegal.
#define TRACKING_TARGET_START_CLAMP_WINDOW_MASK(bits) \
    ((bits) >= 32 ? 0xFFFFFFFFu : ((bits) <= 0 ? 0u : ((1u << (bits)) - 1)))
#define TRACKING_TARGET_START_WINDOW_MASK TRACKING_TARGET_START_CLAMP_WINDOW_MASK(TRACKING_TARGET_START_WINDOW_SIZE) // The noise filtering sliding window mask
#define TRACKING_TARGET_START_REQUIRED_DETECTIONS 5                                                                  // Minimum detections in the sliding window at a given moment, this to reduce noise from triggering a false tracking start.
#define TRACKING_TARGET_START_LOCATION_X_M 0.0f
#define TRACKING_TARGET_START_LOCATION_Y_M 2.0f
#define TRACKING_TARGET_START_LOCATION_TRESHOLD_M 0.2f
#define TRACKING_TARGET_CLUSTER_DISTANCE_TRESHOLD_M 0.4f // THIS HEAVILY DEPENDS ON THE TARGET DIMENSIONS AND SPEED

typedef struct KalmanFilterState
{
    float x;
    float y;
    float vx;
    float vy;
} KalmanFilterState;

typedef struct ClusterTrackingConfig
{
    float start_position_x, start_position_y, start_position_treshold_radius; // The target needs to move to the start location - treshold, before it is getting tracked
    float tracking_radius_treshold;                                           // The target needs to be within the previous location + treshold region to be seen as the same object and to keep being tracked
    // float tracking_velocity_treshold;                                         // The target speed needs to be within this threshold => TO DO: Will not be used yet because the TI IWR1642 can also filter on velocity treshold
} ClusterTrackingConfig;

typedef enum ClusterTrackingState
{
    NONE,
    IS_TRACKING,
    LOST_TRACKING
} ClusterTrackingState;

typedef struct Point
{
    int16_t cluster_id;
    float x, y;
    /*  x - coordinate in meters:
            Positive x-direction is rightwards in the azimuth plane when observed from the sensor towards the scene.
        y - coordinate in meters:
            This axis is perpendicular to the sensor plane with positive direction from the sensor towards the scene.
    */
} Point;

// TO DO: CHANGE STRUCT NAME TO POINTCLOUD
typedef struct DetectedPoints
{
    uint8_t num_detected_points;
    Point detected_points[TI_IWR1642_MAX_DETECTED_POINTS];
} DetectedPoints;

// TO DO: MAYBE JUST TYPEDEF POINT, THIS WOULD ALLOW SOME FUNCTIONS LIKE Tracking_ScanTargetInitialPosition TO BE WRITTEN A LOT CLEANER ??
typedef struct Cluster
{
    int16_t cluster_id;
    float centroid_x; // Estimated x value of the cluster by calculating the arithmetic mean of all data points contained in the cluster.
    float centroid_y; // Estimated y value of the cluster by calculating the arithmetic mean of all data points contained in the cluster.
} Cluster;

typedef struct TrackedCluster
{
    Cluster cluster;
    ClusterTrackingState tracking_state;
} TrackedCluster;

static inline double Math_EuclideanSquaredDistance(Point *p1, Point *p2)
{
    return pow(p1->x - p2->x, 2) + pow(p1->y - p2->y, 2);
}

void SPI_Init(void);
bool SPI_MagicWord_Found(uint8_t *buffer);
bool SPI_MagicWord_WaitFor(void);

// This function call blocks until it has received the application tracking configuration data. Format: CONFIG %f %f %f %f => TO DO: KEEP THIS FORMAT INFO UP TO DATE IF IT CHANGES!
void UART_ReadConfigData(ClusterTrackingConfig *config);
// Used to send the detected points and cluster centroids to a python plotting script for visual debugging purposes.
void UART_SendData(DetectedPoints *detected_points, Cluster *clusters, uint8_t clusters_size);

// Find the neighbours of the currently visited point.
uint8_t DB_Scan_FindNeighbours(DetectedPoints *detected_points, uint8_t index, uint8_t *neighbours);
// Returns true when detecting a valid cluster, returns false when detecting noise.
bool DB_Scan_ExpandCluster(DetectedPoints *detected_points, uint8_t start_index, int16_t cluster_id, bool *visited);
// Returns the number of clusters that are formed.
uint8_t DB_Scan(DetectedPoints *detected_points);
// Calculates the arithmetic mean of each valid cluster.
void DB_Scan_EstimateClusterCentroids(DetectedPoints *detected_points, Cluster *clusters);

// Returns true if a cluster is detected within the configured tracking start location.
bool Tracking_ScanTargetInitialPosition(TrackedCluster *tracked_cluster, Cluster *clusters, uint8_t clusters_size, ClusterTrackingConfig *config);
void Tracking_LocateLostTarget();
bool Tracking_NearestNeighbour(TrackedCluster *tracked_cluster, Cluster *clusters, uint8_t clusters_size, ClusterTrackingConfig *config);
void Tracking_TrackTarget(TrackedCluster *tracked_cluster, Cluster *clusters, uint8_t clusters_size, ClusterTrackingConfig *config);
// Prediction algoritm: this could help to filter out certain edge cases by using predictions based on the x/y velocity of the object => this will remove a lot of edge case but certainly not all!
void Tracking_KalmanInit(KalmanFilterState *state, float x, float y);
void Tracking_KalmanPredict(KalmanFilterState *state, float dt);
void Tracking_KalmanUpdate(KalmanFilterState *state, float meas_x, float meas_y, float alpha);
// void JIPDA_Tracker(void); // TO DO: RESEARCH THIS CONCEPT

static inline uint64_t GetTime_us(void)
{
    return to_us_since_boot(get_absolute_time());
}
// TO DO: THESE FUNCTIONS ARE NOT TESTED YET!
static inline void Benchmark_Start(uint64_t *start_time)
{
    // printf("Start DB Scan + centroid estimation.\r\n");                                            // Benchmark print
    // printf("DB scan Epsilon: %.2f, Min points: %d\r\n\n", DB_SCAN_EPSILON_M, DB_SCAN_MIN_POINTS);  // Benchmark print
    *start_time = GetTime_us();
}
static inline void Benchmark_Stop(uint64_t *start_time, uint64_t *end_time, uint64_t *time_taken)
{
    *end_time = GetTime_us();
    *time_taken = *end_time - *start_time;
    // printf("End DB Scan + centroid estimation.\r\nDB_Scan + centroid estimation took %lld microseconds.\r\n\n", time_taken); // Benchmark print:
}

void Print_Buffer(uint8_t buf[], size_t len);
void Print_DetectedPoints(DetectedPoints *detected_points);
void Print_PointClusterIDs(DetectedPoints *detected_points);
void Print_Clusters(Cluster *clusters, uint8_t size);

// Default magic word that is used in the TI IWR1642 out of the box demo:
// header: uint16_t magicWord[4];
// header.magicWord[0] = 0x0102;
// header.magicWord[1] = 0x0304;
// header.magicWord[2] = 0x0506;
// header.magicWord[3] = 0x0708;
// const uint8_t SPI_MAGIC_WORD[SPI_MAGIC_WORD_LEN] = {0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08}; // The SPI endianess is set to MSB on the TI IWR1642 => TO DO: WHY ISN'T THIS ORDER CORRECT ???
const uint8_t SPI_MAGIC_WORD[SPI_MAGIC_WORD_LEN] = {0x02, 0x01, 0x04, 0x03, 0x06, 0x05, 0x08, 0x07}; // TO DO: EVEN TOUGH THE SPI CONFIG IS SET TO MSB FIRST ON THE IWR1642, THIS ORDER IS RECEIVED, IS THE SPI ON THE TI IWR1642 CONFIGED TO SEND 16bit ? => IS SET TO 8bit, SO WHY THIS ORDER ?

// TI IWR1642 CONFIGURATION (VISUALIZER) TIP:
// In the real-time tuning setting, uncheck 'Group Peaks from the Same Object', both 'Range and Doppler Direction' and check 'remove static cluster' for way better cluster results.
// This will increase the detected points a lot, and shows more groups.
// A nice balance should be created between detecting less points and more points which equals a balance between algorithm performance and algoritme accuracy.
// DB SCAN TIP:
// Play around with the Epsilon and minimum points values. The optimal values will depend on the radar configuration like described above and each unique 'lab/real-life' setting.

// TO DO: USE THE ESTIMATED VELOCITY COMING FROM THE RADAR TO MAKE THE SIMPLIFIED KALMAN FILTER EVEN LIGHTER ???
int main()
{
    // TO DO: INITIALIZE THESE VARIABLES BECAUSE GARBAGE VALUES CAN AND WILL BITE YOUR ASS SOONER OR LATER, SEE THE TRACKED CLUSTER COMMENT!
    DetectedPoints detected_points;
    float point_coo_temp[2] = {0.0f}; // TO DO: TURN THIS IN A LOCAL VARIABLE WHEN MAIN IS REFACTORED INTO FUNCTIONS
    Cluster clusters[DB_SCAN_MAX_CLUSTERS];
    uint8_t detected_cluster_count;
    ClusterTrackingConfig config_cluster_tracking;
    TrackedCluster tracked_cluster = {.tracking_state = NONE};
    uint64_t start_time, end_time, time_taken; // Benchmark

    bool is_tracking_started = false; // TEST

    // 1. Initialize the RP Pico communication systems:
    stdio_init_all();
    SPI_Init();
    DEBUG_LED_INIT();
    sleep_ms(5000); // Sleep to give some time to open a terminal and catch the print messages at the start of the application.

    printf("RP Pico as SPI slave to perform DB-scan, centroid estimation and cluster tracking on TI IWR1642 detected point cloud data.\r\n");

    // 2. The TI IWR1642 will send 0 1 2 3 4 5 6 7 8 9 after it's SPI initialization: => TO DO: REMOVE THIS FROM THE TI IWR1642 CODE BECAUSE THIS IS NOT REALLY NECESSARY AND CAN ONLY BE A POINT OF FAILURE BECAUSE THIS REQUIRES THE RP PICO TO BE START UP BEFORE THE TI IWR1642
    //    When not received, the TI IWR1642 is started before the RP PICO is started, else there is something wrong with the wiring or the TI IWR1642 side of the application.
    uint8_t in_buf[BUF_LEN] = {0};
    printf("Waiting for TI IWR1642 SPI init data:\r\n");
    spi_read_blocking(spi_default, 0, in_buf, BUF_LEN);
    Print_Buffer(in_buf, BUF_LEN);

    // 3. Wait for the python script to send the cluster tracking configuration:
    UART_ReadConfigData(&config_cluster_tracking); // UNCOMMENT FOR PYTHON SCRIPT AND COMMENT OUT THE HARDCODED VALUES
    // DEBUG: HARDCODED TO BE ABLE TO USE THE PICO WITHOUT PYTHON SCRIPT
    // config_cluster_tracking.start_position_x = 0.0f;
    // config_cluster_tracking.start_position_y = 2.0f;
    // config_cluster_tracking.start_position_treshold_radius = 0.3f;
    // config_cluster_tracking.tracking_radius_treshold = 0.3f;

    // 4. The TI IWR1642 will start sending a magic word, the number of detected points, followed by the detected point X/Y pairs:
    while (1)
    {
        // Search for the magic word to synchronize the SPI communication with the TI IWR1642.
        // This makes sure that the actual SPI reading starts at the start of a TI IWR1642 frame.
        // Not waiting for the magic word will cause misreadings because the TI IWR1642 and RP Pico each have their own processing rates/timings.
        // For example, the RP Pico will not keep up with the sending rate of the TI IWR1642 due to the DB scan and centroid estimation algorithms.
        SPI_MagicWord_WaitFor();

        // The TI IWR1642 will send the number of detected points before sending the actual detected point x and y pairs.
        // spi_read_blocking(spi_default, 0, &(detected_points.num_detected_points), 1);
        spi_read_blocking(spi_default, 0, &(detected_points.num_detected_points), sizeof(detected_points.num_detected_points));
        printf("Objects detected: %d\r\n", detected_points.num_detected_points);

        // The TI IWR1642 starts sending the X and Y value of each detected point.
        // The TI IWR1642 will send one X, Y pair per SPI transfer instead of the whole data as 1 stream.
        // This is because the TI IWR1642 has a 64bytes RAM limit when using SPI 8bit mode and 128bytes using SPI 16bit mode.
        // This option is set in the TI IWR1642 SPI master slave options. 8bit mode is used in the 'spot and shoot' application which causes the 64bytes limit which
        // most of the time will not be sufficient for sending the whole point cloud at once, thus the data is split into X, Y pairs of each detected point between SPI transfers.
        for (uint8_t obj_num = 0; obj_num < detected_points.num_detected_points; ++obj_num)
        {
            // BUG: OVERAL IT IS WORKING FINE, BUT SOMETIMES THE DETECTED POINTS ARE LARGE (100+) AND PRODUCES INCORRECT XY VALUES WITH ENORMOUSLY LARGE VALUES.
            // THIS DOES NOT HINDER THE PROGRAM BUT IT SEEMS THAT MORE SPI SYNCHRONISATION IS NEEDED ??
            // THE BUG SEEMS TO ONLY (MOSTLY) OCCUR IF A LARGE NUMBER OF POINTS IS DETECTED OR AT LEAST THE BUG WILL SHOW INSIDE THE CLUSTER ID PRINT.
            spi_read_blocking(spi_default, 0, (uint8_t *)&point_coo_temp, sizeof(point_coo_temp));
            detected_points.detected_points[obj_num].x = point_coo_temp[0];
            detected_points.detected_points[obj_num].y = point_coo_temp[1];
        }

        // 5. Start the DB scan clustering algorithm when points are detected by the TI IWR1642:
        if (detected_points.num_detected_points > 0)
        {
            // Print_DetectedPoints(&detected_points); // Debug print => SEE THE SPI READ BUG ABOVE

            // printf("Start DB Scan + centroid estimation.\r\n");                                            // Benchmark print
            // printf("DB scan Epsilon: %.2f, Min points: %d\r\n\n", DB_SCAN_EPSILON_M, DB_SCAN_MIN_POINTS);  // Benchmark print
            start_time = GetTime_us();
            // Benchmark_Start(&start_time); // TO DO: TEST THIS

            detected_cluster_count = DB_Scan(&detected_points);

            end_time = GetTime_us();
            time_taken = end_time - start_time;
            // printf("End DB Scan + centroid estimation.\r\nDB_Scan + centroid estimation took %lld microseconds.\r\n\n", time_taken); // Benchmark print:
            // Benchmark_Stop(&start_time, &end_time, &time_taken); // TO DO: TEST THIS

            // 6. Estimate the center of the detected clusters by simply using the average of the point coordinates of all points laying inside the corresponding cluster:
            if (detected_cluster_count > 0 && detected_cluster_count <= DB_SCAN_MAX_CLUSTERS)
            {
                DB_Scan_EstimateClusterCentroids(&detected_points, clusters);

                // Debug prints:
                // Print_PointClusterIDs(&detected_points);
                // Print_Clusters(clusters, detected_cluster_count);

                // 7. See if the to be tracked target has moved within the predefined starting position so that the tracking algorithm can start:
                if (!is_tracking_started)
                {
                    if (Tracking_ScanTargetInitialPosition(&tracked_cluster, clusters, detected_cluster_count, &config_cluster_tracking))
                    {
                        // printf("Target is detected at the initial tracking location! Start tracking!\r\n");
                        DEBUG_LED_ON();
                        is_tracking_started = true; // DEBUG: COMMENT WHEN TESTING THE BELOW ELSE CASE, ALSO COMMENT THE TRACKED CLUSTER IS_TRACKED STATE IN Tracking_ScanTargetInitialPosition()
                    }
                    /*
                    else // DEBUG: COMMENT OUT is_tracking_started = true; IN THE CORRESPONDING IF WHEN USING THIS ELSE
                    {
                        DEBUG_LED_OFF();
                    }
                    */
                }
                else // TO DO: START TRACKING, SHOULD INCORPORATE FUNCTIONALITY TO RETRACK THE TARGET WHEN LOST
                {
                    // 8. Track the target along it's path:
                    // 9. Retrack the target when it is lost:
                    // Tracking_TrackTarget(&tracked_cluster, clusters, detected_cluster_count, &config_cluster_tracking);
                }
            }
            else
            {
                printf("Error: Invalid number of clusters returned: %d\r\n", detected_cluster_count);
            }

            // 10. Send the detected points and cluster centroids to a python plotting script for visual debugging purposes:
            UART_SendData(&detected_points, clusters, detected_cluster_count); // UNCOMMENT TO USE PYTHON PLOTTING SCRIPT
        }

        sleep_ms(100); // TEST: STALLING THE TIME TO ALLOW SOME DEBUG PRINTING, OF COURSE IT WILL MISS DATA BUT THAT IS FINE
    }
}

void SPI_Init(void)
{
    // Enable SPI 0 at 1 MHz and connect to GPIOs
    spi_init(spi_default, SPI_FREQUENCY);
    spi_set_slave(spi_default, true);
    gpio_set_function(PICO_DEFAULT_SPI_RX_PIN, GPIO_FUNC_SPI);
    gpio_set_function(PICO_DEFAULT_SPI_SCK_PIN, GPIO_FUNC_SPI);
    gpio_set_function(PICO_DEFAULT_SPI_TX_PIN, GPIO_FUNC_SPI);
    gpio_set_function(PICO_DEFAULT_SPI_CSN_PIN, GPIO_FUNC_SPI);
    // Make the SPI pins available to picotool
    bi_decl(bi_4pins_with_func(PICO_DEFAULT_SPI_RX_PIN, PICO_DEFAULT_SPI_TX_PIN, PICO_DEFAULT_SPI_SCK_PIN, PICO_DEFAULT_SPI_CSN_PIN, GPIO_FUNC_SPI));
}

bool SPI_MagicWord_Found(uint8_t *buffer)
{
    for (int i = 0; i < SPI_MAGIC_WORD_LEN; ++i)
    {
        if (buffer[i] != SPI_MAGIC_WORD[i])
            return false;
    }
    return true;
}

bool SPI_MagicWord_WaitFor(void)
{
    uint8_t buf[SPI_MAGIC_WORD_LEN] = {0};

    while (true)
    {
        // Shift the buffer left by one byte
        memmove(buf, buf + 1, SPI_MAGIC_WORD_LEN - 1);
        // Read one new byte into the last position
        spi_read_blocking(spi_default, 0, &buf[SPI_MAGIC_WORD_LEN - 1], 1);

        if (SPI_MagicWord_Found(buf))
        {
            return true;
        }
        // printf("NO MW\n"); // Debug print
    }
}

void UART_ReadConfigData(ClusterTrackingConfig *config)
{
    float sx, sy, st, dt;

    // printf("Please enter the application user configuration (via python script) via UART before the application can run:\r\n");
    while (1)
    {
        if (scanf("CONFIG %f %f %f %f", &sx, &sy, &st, &dt) == 4)
        {
            config->start_position_x = sx;
            config->start_position_y = sy;
            config->start_position_treshold_radius = st;
            config->tracking_radius_treshold = dt;
            // config->tracking_velocity_treshold; // Not used yet because this could be filtered by the TI IWR1642 itself.
            break;
        }

        // Flush the rest of the line if the format didn't match
        int ch;
        while ((ch = getchar()) != '\n' && ch != EOF)
            ;
    }
}

void UART_SendData(DetectedPoints *detected_points, Cluster *clusters, uint8_t clusters_size)
{
    // Data Format for the python script: (X, Y: float; C_ID: int16_t)
    // START
    // P X Y C_ID
    // P X Y C_ID
    // P ...
    // C X Y C_ID
    // C X Y C_ID
    // C ...
    // END

    printf("START\r\n");
    for (uint8_t p = 0; p < detected_points->num_detected_points; ++p)
    {
        printf("P %.2f %.2f %d\r\n", detected_points->detected_points[p].x, detected_points->detected_points[p].y, detected_points->detected_points[p].cluster_id);
    }
    for (uint8_t c = 0; c < clusters_size; ++c)
    {
        printf("C %.2f %.2f %d\r\n", clusters[c].centroid_x, clusters[c].centroid_y, clusters[c].cluster_id);
    }
    printf("END\r\n");
}

uint8_t DB_Scan_FindNeighbours(DetectedPoints *detected_points, uint8_t index, uint8_t *neighbours)
{
    // Compute if the point is laying within or on the circle with 'center_point' at it's center and 'epsilon' as it's radius:
    //   The Euclidean distance between a random point (X,Y) and the target circle center (Cx,Cy) can be described using Pythagorean theorem.
    //       d = sqrt((X-Cx)² + (Y-Cy)²)
    //   Avoid the expensive square root operation:
    //       d² = (X-Cx)² + (Y-Cy)²
    //   If d² <= epsilon², the random point is laying within or on the target circle and thus qualifies as a neighbour.
    //   This is true because the distance between the points needs to be equal or less then the radius epsilon of the circle.

    uint8_t count = 0;
    for (uint8_t i = 0; i < detected_points->num_detected_points; ++i)
    {
        if (i != index && (Math_EuclideanSquaredDistance(&(detected_points->detected_points[index]), &(detected_points->detected_points[i])) <= DB_SCAN_EPSILON_SQUARED_M))
        {
            neighbours[count++] = i;
        }
    }
    return count;
}

bool DB_Scan_ExpandCluster(DetectedPoints *detected_points, uint8_t start_index, int16_t cluster_id, bool *visited)
{
    uint8_t queue[TI_IWR1642_MAX_DETECTED_POINTS]; // Queue to hold points to process
    uint8_t front = 0, back = 0;                   // Queue pointers

    // Initialize queue with the starting point
    queue[back++] = start_index;
    detected_points->detected_points[start_index].cluster_id = cluster_id;
    visited[start_index] = true;

    bool has_core_point = false;

    while (front < back)
    {
        uint8_t current_index = queue[front++]; // Dequeue point

        uint8_t neighbours[TI_IWR1642_MAX_DETECTED_POINTS];
        uint8_t neighbour_count = DB_Scan_FindNeighbours(detected_points, current_index, neighbours);

        if (neighbour_count >= DB_SCAN_MIN_POINTS) // Core point
        {
            has_core_point = true;
            for (uint8_t i = 0; i < neighbour_count; ++i)
            {
                uint8_t neighbour_index = neighbours[i];

                if (!visited[neighbour_index])
                {
                    // Mark as visited and add to queue
                    visited[neighbour_index] = true;
                    detected_points->detected_points[neighbour_index].cluster_id = cluster_id;
                    queue[back++] = neighbour_index; // Enqueue neighbour
                }
            }
        }
    }

    // If no core point was found, classify the entire cluster as noise
    if (!has_core_point)
    {
        for (uint8_t i = 0; i < back; ++i)
        {
            detected_points->detected_points[queue[i]].cluster_id = DB_SCAN_POINT_NOISE;
        }

        return false;
    }

    return true;
}

uint8_t DB_Scan(DetectedPoints *detected_points)
{
    int16_t next_cluster_id = 1;
    uint8_t valid_cluster_count = 0;
    bool visited[TI_IWR1642_MAX_DETECTED_POINTS] = {false};

    for (uint8_t i = 0; i < detected_points->num_detected_points; ++i)
    {
        if (!visited[i])
        {
            if (DB_Scan_ExpandCluster(detected_points, i, next_cluster_id, visited))
            {
                ++valid_cluster_count;
                ++next_cluster_id;
            }
        }
    }

    return valid_cluster_count;
}

void DB_Scan_EstimateClusterCentroids(DetectedPoints *detected_points, Cluster *clusters)
{
    // Estimating the Cluster Centroid by calculating the simple arithmetic mean. => TO DO: Are there better ways of calculating this ???
    float sum_x[DB_SCAN_MAX_CLUSTERS] = {0};
    float sum_y[DB_SCAN_MAX_CLUSTERS] = {0};
    uint8_t count[DB_SCAN_MAX_CLUSTERS] = {0};
    int16_t cluster_id = DB_SCAN_POINT_UNCLASSIFIED;
    int16_t max_cluster_id = 0;

    // Sum the x and y coordinates of points in each unique cluster
    for (uint8_t i = 0; i < detected_points->num_detected_points; ++i)
    {
        cluster_id = detected_points->detected_points[i].cluster_id;
        /*
        if (cluster_id <= 0 || cluster_id >= DB_SCAN_MAX_CLUSTERS) // THIS IF STATEMENT CHECKS THE SAME STATE AS BELOW BUT CAN SERVE AS DEBUG PRINT
        {
            // printf("Warning: Skipping invalid cluster_id %d at point %d\n", cluster_id, i);
            continue;
        }
        */

        // Exclude noise points (Also prevents possible negative indexing because cluster_id is an int16_t which (shouldn't)could be -1 (DB_SCAN_POINT_UNCLASSIFIED)
        if (cluster_id > DB_SCAN_POINT_NOISE && cluster_id < DB_SCAN_MAX_CLUSTERS)
        {
            sum_x[cluster_id] += detected_points->detected_points[i].x;
            sum_y[cluster_id] += detected_points->detected_points[i].y;
            count[cluster_id]++;

            if (cluster_id > max_cluster_id)
            {
                max_cluster_id = cluster_id;
            }
        }
    }

    // Compute the centroid of each cluster
    for (int16_t cluster = 1; cluster <= max_cluster_id; ++cluster)
    {
        if (count[cluster] > 0 && (cluster - 1) < DB_SCAN_MAX_CLUSTERS)
        {
            clusters[cluster - 1].cluster_id = cluster;
            clusters[cluster - 1].centroid_x = sum_x[cluster] / count[cluster];
            clusters[cluster - 1].centroid_y = sum_y[cluster] / count[cluster];
            // printf("Cluster %d centroid: (%.2f, %.2f)\n", clusters[cluster - 1].cluster_id, clusters[cluster - 1].centroid_x, clusters[cluster - 1].centroid_y);
        }
    }
}

// Sligthly refactored but not tested version of the original, if something goes wrong, check the original funtion in the .rar that was made.
bool Tracking_ScanTargetInitialPosition(TrackedCluster *tracked_cluster, Cluster *clusters, uint8_t clusters_size, ClusterTrackingConfig *config)
{
    // This scanning function uses a sliding window as a means to prevent noise from triggering a false tracking start.

    Point target_location = {.cluster_id = DB_SCAN_POINT_UNCLASSIFIED, .x = config->start_position_x, .y = config->start_position_y};
    Point temp_cluster_data = {.cluster_id = DB_SCAN_POINT_UNCLASSIFIED, .x = 0.0f, .y = 0.0f};
    static uint32_t detection_history = 0;
    uint8_t detection_count = 0;
    bool target_found = false;

    if (tracked_cluster->tracking_state == IS_TRACKING)
        return true;

    // Determine if any cluster is close enough to the target start point
    for (uint8_t i = 0; i < clusters_size; ++i)
    {
        temp_cluster_data.cluster_id = clusters[i].cluster_id;
        temp_cluster_data.x = clusters[i].centroid_x;
        temp_cluster_data.y = clusters[i].centroid_y;
        if (Math_EuclideanSquaredDistance(&temp_cluster_data, &target_location) <= config->start_position_treshold_radius)
        {
            target_found = true;
            break;
        }
    }

    // Update the sliding window: Shift left to make room for the new value, OR in the new result (1 or 0), then mask
    detection_history = ((detection_history << 1) | (target_found ? 1u : 0u)) & TRACKING_TARGET_START_WINDOW_MASK;

    // Count number of '1's in the current history/sliding window
    detection_count = __builtin_popcount(detection_history);

    // printf("DEBUG\r\nTRACKSTART\r\n%d %d\r\n", detection_count, detection_history); // DEBUG: print sent to python script

    if (detection_count >= TRACKING_TARGET_START_REQUIRED_DETECTIONS)
    {
        tracked_cluster->cluster.cluster_id = temp_cluster_data.cluster_id;
        tracked_cluster->cluster.centroid_x = temp_cluster_data.x;
        tracked_cluster->cluster.centroid_y = temp_cluster_data.y;
        tracked_cluster->tracking_state = IS_TRACKING; // DEBUG: COMMENT OUT WHEN TESTING THE ELSE CASE TO TURN THE LED OFF AGAIN IF THE TARGET MOVED AWAY FROM THE START POSITION
        return true;
    }

    return false;
}

void Tracking_LocateLostTarget()
{
}

// NOT TESTED YET AND QUICKLY CODED, CHECK THIS TOMORROW
bool Tracking_NearestNeighbour(TrackedCluster *tracked_cluster, Cluster *clusters, uint8_t clusters_size, ClusterTrackingConfig *config)
{
    // TO DO: ALSO USE A SLIDING WINDOW TO PREVENT NOISE FROM TRIGGERING A FOLLOW AND COMBINE IT USING A TIMEOUT SO
    //        THAT SOME FRAMES WITHOUT DETECTION WON'T CAUSE AN IMMEDIATE 'NOT FOUND'

    Point target_location = {.cluster_id = DB_SCAN_POINT_UNCLASSIFIED, .x = tracked_cluster->cluster.centroid_x, .y = tracked_cluster->cluster.centroid_y};
    Point cluster_temp = {.cluster_id = DB_SCAN_POINT_UNCLASSIFIED, .x = 0.0f, .y = 0.0f};
    bool is_target_found = false;

    for (uint8_t cluster = 0; cluster < clusters_size; ++cluster)
    {
        cluster_temp.x = clusters[cluster].centroid_x;
        cluster_temp.y = clusters[cluster].centroid_y;

        if (Math_EuclideanSquaredDistance(&cluster_temp, &target_location) <= config->tracking_radius_treshold)
        {
            tracked_cluster->cluster = clusters[cluster];
            return true;
        }
    }

    return false;
}

void Tracking_TrackTarget(TrackedCluster *tracked_cluster, Cluster *clusters, uint8_t clusters_size, ClusterTrackingConfig *config)
{
    // TO DO: THIS IS JUST SOME TEST STRUCTURE LAYOUT OF HOW THIS FUNCTION SHOULD LOOK LIKE, THIS CODE IS NOT TESTED FOR FUNCTIONALITY
    if (Tracking_NearestNeighbour(tracked_cluster, clusters, clusters_size, config) == false)
    {
        Tracking_LocateLostTarget();
    }
}

void Tracking_KalmanInit(KalmanFilterState *state, float x, float y)
{
    state->x = x;
    state->y = y;
    state->vx = 0.0f;
    state->vy = 0.0f;
}

void Tracking_KalmanPredict(KalmanFilterState *state, float dt)
{
    state->x += state->vx * dt;
    state->y += state->vy * dt;
}

void Tracking_KalmanUpdate(KalmanFilterState *state, float meas_x, float meas_y, float alpha)
{
    // alpha ∈ [0,1] is the trust in measurement vs. prediction (e.g., 0.5)
    float new_x = alpha * meas_x + (1.0f - alpha) * state->x;
    float new_y = alpha * meas_y + (1.0f - alpha) * state->y;

    // Estimate the velocity (Extra: could be low-pass filtered) => TO DO:  I CAN GET THE VELOCITY ESTIMATE FROM THE TI IWR1642
    state->vx = (new_x - state->x);
    state->vy = (new_y - state->y);

    state->x = new_x;
    state->y = new_y;
}

void Print_Buffer(uint8_t buf[], size_t len)
{
    size_t i;
    for (i = 0; i < len; ++i)
    {
        if (i % 16 == 15)
            printf("%02x\n", buf[i]);
        else
            printf("%02x ", buf[i]);
    }

    // append trailing newline if there isn't one
    if (i % 16)
    {
        putchar('\n');
    }
}

void Print_DetectedPoints(DetectedPoints *detected_points)
{
    printf("Print all detected points:\r\n");
    for (uint8_t p = 0; p < detected_points->num_detected_points; ++p)
    {
        printf("Point X: %.2f, Y: %.2f\r\n", detected_points->detected_points[p].x, detected_points->detected_points[p].y);
    }
    printf("\r\n");
}

void Print_PointClusterIDs(DetectedPoints *detected_points)
{
    printf("Print the cluster IDs off all %d detected points:\r\n", detected_points->num_detected_points);
    for (uint8_t p = 0; p < detected_points->num_detected_points; ++p)
    {
        printf("Cluster id: %d\r\n", detected_points->detected_points[p].cluster_id);
    }
    printf("\r\n");
}

void Print_Clusters(Cluster *clusters, uint8_t size)
{
    printf("Print all cluster IDs and corresponding centroids:\r\n");
    for (uint8_t c = 0; c < size; ++c)
    {
        printf("Cluster id: %d, centroid: (%.2f, %.2f)\r\n", clusters[c].cluster_id, clusters[c].centroid_x, clusters[c].centroid_y);
    }
    printf("\r\n");
}
