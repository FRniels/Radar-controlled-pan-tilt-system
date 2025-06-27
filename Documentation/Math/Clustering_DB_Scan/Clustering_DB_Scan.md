# Density Based Scan clustering algorithm
The TI IWR1642 will send out a point cloud. However, this point cloud itself, does not classify the points it detects.
For classifying points in a point cloud, a higher level processing algorithm needs to be used.
A first step in trying to classify the point data, is to try and cluster together corresponding points that probably make up 1 object.
Alongside trying to form clusters, noise can be filtered out.

2 Algorithms that could handle this are:
- K-means: Suited for detecting circle like shapes
- Density Based scan: Suited for arbitrary shapes.

## K-means
The implementation is not explained as it is not implemented in the SpotNShot application.
![image](https://github.com/user-attachments/assets/6aed2e5e-4ee4-4b0e-8519-db4b059a192f)
### Strength
Can be computationally efficient compared to DB-scan.
### Weakness
K-means's biggest weakness's are a varying quantity of clusters and arbitrary cluster shapes as K-means
needs to know the quantity of clusters before execution and it prefers circular cluster shapes.
Both of these weakness's are not tolerable in the SpotNShot application.

## DB scan
The following image is plucked straight out of a biology book, but the core concept of the DB scanning algorithm stays the same:
![image](https://github.com/user-attachments/assets/fd6cef1f-b191-4788-915b-68cd43f0e5b5)

### Implementation details
At the start of the algorithm, 2 variables that will influence accuracy need to be chosen:
- Radius (epsilon)
- The minimum points that need to lay inside epsilon

Algorithm:
- Start at a randomly chosen point.
- Check if it has enough neighbours laying in the defined Radius:
  - If so: classify it as a core point
  - If not: classify it as noise
  - If not, but the point is connected to a core point: classify it as an edge point
- Continue the algorithm recursively/iteratively untill all points are classified.
- Extra: Calculate the midpoint of the formed clusters to use it as final X/Y coordinates of the individual clusters.
### Strength
DB-scan handles a varying quantity of clusters and arbitrary cluster shapes very well compared to K-means.
### Weakness
Can be computationally expensive and does not operate well on (pretty) small data sets.

## Chosen algorithm (DB scan)
In this project, DB scan is the chosen algorithm. This choice is led by the fact that DB scan is more accurate in clustering
arbitrary shapes in which K-means will probably fail in those situations.
K-means will also often fail in recognizing close neighbouring clusters and unrightfully label them as one cluster.
Although K-means could be experimented with depending on the application.
However, 2 big concerns arise when using this algorithm for the SporNShot application.
- If multiple people are close together and K-means clusters them together, the calculated mid X/Y point could significantly drift, which would cause the spotlight's accuracy to drop.
- The K-means algorithm requires to know the quantity of clusters before execution, which will be rather hard in most real-life scenarios.
