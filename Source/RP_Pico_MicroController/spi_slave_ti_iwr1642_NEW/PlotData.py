import serial
import tkinter as tk
from tkinter import simpledialog, messagebox
import matplotlib.pyplot as plt

def Tracking_GetStartLocation():
    root = tk.Tk()
    root.withdraw()  # Hide the root window

    # Prompt for inputs
    try:
        start_x = simpledialog.askfloat("Start Configuration", "Enter tracking start position X (meters):", parent=root)
        start_y = simpledialog.askfloat("Start Configuration", "Enter tracking start position Y (meters):", parent=root)
        start_location_threshold = simpledialog.askfloat("Start Configuration", "Enter tracking start position radius threshold (meters):", parent=root)
        tracking_distance_threshold = simpledialog.askfloat("Start Configuration", "Enter tracking distance threshold (meters):", parent=root)

        if None in (start_x, start_y, start_location_threshold, tracking_distance_threshold):
            messagebox.showinfo("Cancelled", "User cancelled input. Exiting.")
            exit(0)
        return start_x, start_y, start_location_threshold, tracking_distance_threshold

    except Exception as e:
        messagebox.showerror("Error", f"Failed to get input: {e}")
        exit(1)

def UART_ReadData(ser):

    # Data Format: (X, Y: float; C_ID: int16_t)
    # START
    # P X Y C_ID
    # P X Y C_ID
    # P ...
    # C X Y C_ID
    # C X Y C_ID
    # C ...
    # END

    points = []
    centroids = []

    # Look for the start of a frame
    while True:
        line = ser.readline().decode('utf-8', errors='ignore').strip()
        if line == "START":
            break
        # UART_ReadData() may block indefinitely while waiting for "START" if the RP Pico is not sending valid data yet
        # So safest is to check if the user closed the window here so the window can be closed gracefully
        if not plt.fignum_exists(1):  
            return None, None

    # Parse until END
    while True:
        line = ser.readline().decode('utf-8', errors='ignore').strip()
        if line == "END":
            break
        if not line:
            continue

        if line.startswith("P"):
            try:
                _, x, y, cid = line.split()
                points.append({
                    'x': float(x),
                    'y': float(y),
                    'cluster': int(cid)
                })
            except ValueError:
                continue  # Skip malformed
        elif line.startswith("C"):
            try:
                _, x, y, cid = line.split()
                centroids.append({
                    'x': float(x),
                    'y': float(y),
                    'cluster': int(cid)
                })
            except ValueError:
                continue

    return points, centroids

def Plot_DB_Scan(points, centroids, waiting=False):
    plt.clf()  # Clear the previous plot

    if waiting:
        plt.title("Waiting for radar data...")
    else:
        cluster_colors = {}
        color_cycle = plt.get_cmap('tab10', 10)

        for point in points:
            cid = point['cluster']
            if cid not in cluster_colors:
                cluster_colors[cid] = color_cycle(cid % 10) if cid >= 0 else 'gray'

        for point in points:
            color = cluster_colors[point['cluster']]
            plt.scatter(point['x'], point['y'], c=[color], s=30)

        for c in centroids:
            # Plot the centroid as an X
            plt.scatter(c['x'], c['y'], c='black', marker='x', s=100, linewidths=2)

            # Label near the centroid
            label = f"ID {c['cluster']}\n({c['x']:.2f}, {c['y']:.2f})"
            plt.text(c['x'] + 0.2, c['y'] + 0.2, label, # Label offset from the estimated centroid
                     fontsize=8, color='black', ha='left', va='bottom',
                     bbox=dict(facecolor='white', alpha=0.6, edgecolor='gray', boxstyle='round,pad=0.2'))

        plt.title("DBSCAN Clusters and Centroids")

    # Set fixed axis and labels
    plt.xlim(-5, 5)
    plt.ylim(0, 8)
    plt.axhline(y=0, color='black', linewidth=0.5)
    plt.axvline(x=0, color='black', linewidth=0.5)
    plt.xlabel("X (meters)")
    plt.ylabel("Y (meters)")
    plt.grid(True)
    plt.gca().set_aspect('equal', adjustable='box')
    plt.pause(0.01)  # Update and show the plot

def main():
    plt.ion()           # Enable interactive mode
    fig = plt.figure(1) # Plotting window

    # Open serial port (adjust COM port and baudrate), Exit the application if it fails
    try:
        ser = serial.Serial('COM9', 115200, timeout=1)  # Update COMX to your Pico's port
    except serial.SerialException as e:
        print(f"Could not open serial port: {e}")
        return

    # Retreive and send the tracking configuration for the start location and treshold for the to be tracked cluster 
    start_x, start_y, start_location_threshold, tracking_distance_threshold = Tracking_GetStartLocation()
    # print(f"Start X: {start_x}, Start Y: {start_y}, Radius: {threshold}")
    config_str = f"CONFIG {start_x} {start_y} {start_location_threshold} {tracking_distance_threshold}\n"
    ser.write(config_str.encode())


    try:
        # Plot a "waiting" frame until data is received
        Plot_DB_Scan([], [], waiting=True)

        while plt.fignum_exists(fig.number): # Exit the application if the plotting window is closed
            points, centroids = UART_ReadData(ser)
            if points is None and centroids is None:
                break  # Window was closed during waiting
            Plot_DB_Scan(points, centroids)
    except KeyboardInterrupt:
        print("Interrupted by user.")
    finally:
        ser.close()
        plt.ioff()
        plt.close()

if __name__ == '__main__':
    main()