import numpy as np
import matplotlib.pyplot as plt
from matplotlib import style



# Chirp Parameters
f_start = 440          # Start frequency in Hz
f_end = 10000          # End frequency in Hz
Tc = 0.05              # Chirp duration in seconds
sample_rate = 44100    # Discrete samples per second
dt = 1 / sample_rate   # Time step between discrete samples

# Derived values
t = np.linspace(0, Tc, int(Tc * sample_rate), endpoint=False) # Generate discrete time data for the chirp plots
k = (f_end - f_start) / Tc                                    # Compute the chirp slope
tau = (1 / f_start) * 0.25                                    # * 0.25 gives a 90degree phase shift of the starting frequency
phi = 2 * np.pi * f_start * tau                               # Computed start phase shift

# Generate chirp Tx/Rx signals (IMPORTANT: These generated signals are already normalized because they are values between -1 and 1)
CHIRP_SIGNAL_SIZE = len(t) # chirp length

chirp_signal_tx = np.sin(2 * np.pi * (f_start * t + 0.5 * k * t**2))
chirp_signal_rx = np.sin(2 * np.pi * (f_start * (t - tau) + (k / 2) * (t - tau)**2 ))

# Digital Signal Processing
chirp_signal_mixed = chirp_signal_tx * chirp_signal_rx
chirp_signal_mixed_beat_approximation = np.cos( 2 * np.pi * (f_start * tau + k * tau * t))

# FIR Low Pass Filter parameters
cutoff_hz = 1500      # Set this based on your expected max beat frequency => 1.5KHz is chosen right now to not filter out the lowest frequencies in the mixed chirp as visual demonstration
numtaps = 101         # Must be odd for symmetry
LOWPASS_OUTPUT_SIZE = len(chirp_signal_mixed) + numtaps - 1
lowpass_output_signal = np.zeros(LOWPASS_OUTPUT_SIZE)

# Hilbert transformation
HILBERT_IMPULSE_RESPONSE_SIZE = 51 # Note: use an odd size! => TO DO: HOW DOES SIZE AFFECT THE FINAL CONVOLUTION RESULT ??
HILBERT_TRANSFORM_RESULT_SIZE = CHIRP_SIGNAL_SIZE + HILBERT_IMPULSE_RESPONSE_SIZE - 1 

hilbert_impulse_response = np.zeros(HILBERT_IMPULSE_RESPONSE_SIZE)
hilbert_transform_result = np.zeros(HILBERT_TRANSFORM_RESULT_SIZE)

# Analytic signal and instantaneous amplitude (envelope), frequency and phase acquisition
analytic_signal = np.zeros(HILBERT_TRANSFORM_RESULT_SIZE)



def ImpulseResponse_Create_FIR_LowPass(cutoff_hz, sample_rate, numtaps): # TO DO: STUDY THIS TOMORROW => STUDIED A MOVING AVERAGE FILTER BEFORE BUT NOT YET A FIR IMPLEMENTATION
    """
    Design a low-pass FIR filter using a sinc function and Hamming window.
    cutoff_hz:     cutoff frequency in Hz
    sample_rate:   sampling rate in Hz
    numtaps:       number of filter taps (must be odd)
    """
    # Normalized cutoff (0 to 1, where 1 = Nyquist = fs/2)
    norm_cutoff = cutoff_hz / (sample_rate / 2)

    # Create symmetric time base (centered at 0)
    n = np.arange(numtaps)
    middle = (numtaps - 1) / 2.0
    h = np.sinc((n - middle) * norm_cutoff)

    # Apply Hamming window to reduce side lobes
    h *= np.hamming(numtaps)

    # Normalize gain to 1 (to preserve signal amplitude)
    h /= np.sum(h)
    return h

def Convolution_LowPassFilter(input_signal, impulse_response, output_signal):
    """
    Perform convolution: y[n] = sum_{m=0}^{M-1} x[m] * h[n - m]
    where:
        - input_signal: x[m]
        - impulse_response: h[k]
        - output_signal: y[n] of length M + N - 1
    """
    input_size = len(input_signal)               # Length of input signal (x[m])
    impulse_size = len(impulse_response)         # Length of filter (h[k])
    output_size = input_size + impulse_size - 1  # Full convolution size

    # Manually clear output signal
    for n in range(output_size):
        output_signal[n] = 0.0

    # Perform convolution (equivalent to sliding impulse response over input signal)
    for n in range(output_size):                 # For each output sample y[n]
        for k in range(impulse_size):            # For each impulse response value h[k]
            m = n - k                            # Calculate corresponding input index
            if 0 <= m < input_size:              # Check bounds of input signal
                output_signal[n] += input_signal[m] * impulse_response[k]

def ImpulseResponse_Create_HilbertTransform(size):
    """
    Create a finite discrete approximation of h[n] = 1 / (π n), skipping n=0.
    Returns an array of length `size` centered around zero (odd size preferred).
    """
    # The impulse response is centered around 0, with 0 excluded, thus an odd size impulse response is necessary to create an equal amount of samples on each side of 0
    if size % 2 == 0: 
        raise ValueError("Impulse response size should be odd")

    half = size // 2   # Python integer division so the result can't be a floating point value 
    h = np.zeros(size) # Create an array to hold the computed impulse response
    for n in range(-half, half + 1):
        if n == 0: # Prevent dividing by 0
            continue
        h[n + half] = 1 / (np.pi * n) # Compute each discrete impulse response sample. (Shift the index n by half the impulse response size so that the indexing starts at 0)
    return h

def Convolution_HilbertTransform(input_signal, impulse_response, output_signal): # Performs convolution: hilbert_impulse_response * mixed_signal
    print("Performing the Hilbert transform on the original signal.")
    for m in range(CHIRP_SIGNAL_SIZE):            # m = index for input_signal (x[m])
        for i in range(HILBERT_IMPULSE_RESPONSE_SIZE):  # i = index for impulse_response (h[i])
            # n shifts the impulse response over the input signal. (It's start value is incremented each output component row that is iterated over)
            n = m + i                                   # total output sample index in output signal (y[n]) => i = n - m => thus h(i) = h(n-m)
            if n < HILBERT_TRANSFORM_RESULT_SIZE:
                # contribution: input_signal[m] * impulse_response[i]       # x[m] * h[i]
                output_signal[n] += input_signal[m] * impulse_response[i]   # y[n] += x[m] * h[n - m], where (n - m) = i
   
def AnalyticSignal_Create():  
    print("Creating the analytic signal by combining the original signal as real component and the Hilbert transform as the imaginary component.")
 
def AnalyticSignal_ComputeInstantaneousAmplitude():
    print("Compute the instantaneous amplitude from the analytic signal.")

def AnalyticSignal_ComputeInstantaneousFrequency():
    print("Compute the instantaneous frequency from the analytic signal.")
    
def AnalyticSignal_ComputeInstantaneousPhase():
    print("Compute the instantaneous phase from the analytic signal.")
    
def main():
    # 1. Low Pass Filter the mixed Tx/Rx chirp
    lpf_kernel = ImpulseResponse_Create_FIR_LowPass(cutoff_hz, sample_rate, numtaps)
    Convolution_LowPassFilter(chirp_signal_mixed, lpf_kernel, lowpass_output_signal)
    # Trim to match the original chirp size
    start = (numtaps - 1) // 2
    lowpass_output_trimmed = lowpass_output_signal[start:start + len(chirp_signal_mixed)]
    
    # 2. Hilbert transform
    hilbert_impulse_response = ImpulseResponse_Create_HilbertTransform(HILBERT_IMPULSE_RESPONSE_SIZE)
    # Convolution_HilbertTransform(chirp_signal_mixed, hilbert_impulse_response, hilbert_transform_result)
    Convolution_HilbertTransform(lowpass_output_trimmed, hilbert_impulse_response, hilbert_transform_result)
    
    # 3. Trim the Hilbert transform result to match the input signal length
    start = (HILBERT_IMPULSE_RESPONSE_SIZE - 1) // 2
    end = start + CHIRP_SIGNAL_SIZE
    hilbert_transform_result_trimmed = hilbert_transform_result[start:end]

    # 4. Create the analytic signal
    # analytic_signal = chirp_signal_mixed + 1j * hilbert_transform_result_trimmed
    analytic_signal = lowpass_output_trimmed + 1j * hilbert_transform_result_trimmed
    
    # 5. Instantaneous amplitude (envelope), frequency and phase and acquisition
    amplitude_envelope = np.abs(analytic_signal)
    instantaneous_phase = np.unwrap(np.angle(analytic_signal))
    instantaneous_frequency = np.gradient(instantaneous_phase, dt) / (2 * np.pi)
    expected_instantaneous_frequency = f_start + k * t # Gives the expected instantaneous frequency at each time point t

    # 6. Plotting
    # Custom soft dark theme (light-dark gray)
    plt.rcParams.update({
        'figure.facecolor': '#2e2e2e',     # Figure background (darker gray)
        'axes.facecolor': '#3c3c3c',       # Axes (plot area) background (medium gray)
        'savefig.facecolor': '#2e2e2e',    # For saving images

        'text.color': 'white',
        'axes.labelcolor': 'white',
        'xtick.color': 'white',
        'ytick.color': 'white',
        'axes.edgecolor': 'white',
        'grid.color': '#555555',           # Soft gray grid
        'legend.facecolor': '#3c3c3c',     # Match axes background
        'legend.edgecolor': 'white',
        'legend.labelcolor': 'white',
    })
    
    fig, axes = plt.subplots(nrows=7, ncols=1, figsize=(20, 10), sharex=True)

    fig.suptitle("Radar signal mixing and signal property acquisition", fontsize=16)

    # Tx
    axes[0].set_title("Chirp Tx signal (440Hz - 10KHz)")
    axes[0].plot(t, chirp_signal_tx, color="blue")
    axes[0].set_ylabel("Amplitude")
    axes[0].grid(True)

    # Rx
    axes[1].set_title("Chirp Rx signal (lagging by 90°)")
    axes[1].plot(t, chirp_signal_rx, color="orange")
    axes[1].set_ylabel("Amplitude")
    axes[1].grid(True)

    # Mixed Tx/Rx & beat signal
    axes[2].set_title("Mixed Tx/Rx signal and Beat Approximation")
    axes[2].plot(t, chirp_signal_mixed, label="Mixed Tx/Rx", color="purple")
    axes[2].plot(t, chirp_signal_mixed_beat_approximation, label="Beat Approx.", color="#DFFF00", linestyle="--")
    axes[2].set_ylabel("Amplitude")
    axes[2].legend(loc='upper right', bbox_to_anchor=(1, 0.85))
    axes[2].grid(True)
    
    # Low Pass Filtered mixed Tx/Rx signal
    axes[3].set_title("Low pass filtered mixed Tx/Rx signal")
    axes[3].plot(t, lowpass_output_trimmed, label="Filtered mixed Tx/Rx", color="purple")
    axes[3].set_ylabel("Amplitude")
    axes[3].grid(True)
    
    # Hilbert
    axes[4].set_title("Hilbert Transform of Mixed Signal (+90° phase shift)")
    axes[4].plot(t, hilbert_transform_result_trimmed, color="green")
    axes[4].set_ylabel("Amplitude")
    axes[4].grid(True)

    # Analytic signal
    axes[5].set_title("Analytic Signal (Real + j * Imag)")
    axes[5].plot(t, np.real(analytic_signal), label="Real (Tx/Rx)", color="purple")
    axes[5].plot(t, np.imag(analytic_signal), label="Imag (Hilbert)", color="green", linestyle="--")
    axes[5].legend(loc='upper right', bbox_to_anchor=(1, 0.85))
    axes[5].set_ylabel("Amplitude")
    axes[5].grid(True)

    # Shared plot: Envelope + Phase + Frequency
    axes[6].set_title("Envelope, Phase and Frequency from Analytic Signal")
    # Primary Y-axis (Amplitude)
    axes[6].plot(t, amplitude_envelope, label="Envelope", color="#DFFF00")
    axes[6].set_ylabel("Amplitude", color="#DFFF00")
    axes[6].tick_params(axis='y', labelcolor='#DFFF00')
    # Secondary Y-axis (Phase)
    ax_phase = axes[6].twinx()
    ax_phase.plot(t, instantaneous_phase, label="Phase", color="#CD607E", linestyle="--")
    ax_phase.set_ylabel("Phase (radians)", color="#CD607E")
    ax_phase.tick_params(axis='y', labelcolor='#CD607E')
    ax_phase.set_yticks([phi])
    ax_phase.set_yticklabels([f"{phi:.2f}"])
    # Third Y-axis (Frequency)
    ax_freq = axes[6].twinx()
    ax_freq.spines["right"].set_position(("axes", 1.05))
    # ax_freq.plot(t, instantaneous_frequency, color="green", linestyle=":", label="Frequency")
    ax_freq.plot(t, expected_instantaneous_frequency, color="#00CED1", linestyle="--", label="Expected")
    ax_freq.set_ylabel("Freq (Hz)", color="#00CED1")
    ax_freq.tick_params(axis='y', labelcolor='#00CED1')
    ax_freq.set_ylim(f_start - 100, f_end + 100)
    ax_freq.set_yticks([f_start, f_end])
    
    # Only set the x label of the last plot because all plots are against time (s)
    axes[6].set_xlabel("Time (s)")
    axes[6].grid(True)

    # Final layout adjustments
    plt.tight_layout(rect=[0, 0, 1, 0.96])
    
    mng = plt.get_current_fig_manager()
    
    # Try maximizing the matplot window because the plots take up a lot of space
    try:
        mng.window.state('zoomed')      # Windows
    except AttributeError:
        try:
            mng.window.showMaximized()  # Linux
        except AttributeError:
            # For Mac or others fallback, no built-in maximize but can resize manually:
            mng.resize(*mng.window.maxsize())

    
    plt.show()


if __name__ == "__main__":
    main()