import numpy as np
import matplotlib.pyplot as plt
from matplotlib import style

def HilbertTransform(input_signal, impulse_response, output_signal):
    print("Performing the Hilbert transform on the original signal.")
   
def AnalyticSignal_Create():  
    print("Creating the analytic signal by combining the original signal as real component and the Hilbert transform as the imaginary component.")
 
def AnalyticSignal_ComputeInstantaneousAmplitude():
    print("Compute the instantaneous amplitude from the analytic signal.")

def AnalyticSignal_ComputeInstantaneousFrequency():
    print("Compute the instantaneous frequency from the analytic signal.")
    
def AnalyticSignal_ComputeInstantaneousPhase():
    print("Compute the instantaneous phase from the analytic signal.")
    
def main():
    fig = plt.figure(1) # Plotting window
    
    plt.tight_layout()
    
    style.use('ggplot') # Emulate the styling of the ggplot (plotting package for R)
    # style.use("dark_background")
    style.use("Solarize_Light2")
    
    try:
        # Plot a "waiting" frame until data is received
        # Plot_DB_Scan([], [], waiting=True)

        while plt.fignum_exists(fig.number): # Exit the application if the plotting window is closed
            # Plot_DB_Scan(points, centroids)

    except KeyboardInterrupt:
        print("Interrupted by user.")
    finally:
        plt.close()

if __name__ == "__main__":
    main()