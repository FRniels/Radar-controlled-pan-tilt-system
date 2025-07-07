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
amplitude_envelope = None
instantaneous_phase = None
instantaneous_frequency = None
lowpass_output_trimmed = None
hilbert_transform_result_trimmed = None

def ImpulseResponse_Create_FIR_LowPass(cutoff_hz, sample_rate, numtaps):
    norm_cutoff = cutoff_hz / (sample_rate / 2)
    n = np.arange(numtaps)
    middle = (numtaps - 1) / 2.0
    h = np.sinc((n - middle) * norm_cutoff)
    h *= np.hamming(numtaps)
    h /= np.sum(h)
    return h

def Convolution_LowPassFilter(input_signal, impulse_response, output_signal):
    input_size = len(input_signal)
    impulse_size = len(impulse_response)
    output_size = input_size + impulse_size - 1
    for n in range(output_size):
        output_signal[n] = 0.0
    for n in range(output_size):
        for k in range(impulse_size):
            m = n - k
            if 0 <= m < input_size:
                output_signal[n] += input_signal[m] * impulse_response[k]

def ImpulseResponse_Create_HilbertTransform(size):
    if size % 2 == 0: 
        raise ValueError("Impulse response size should be odd")
    half = size // 2
    h = np.zeros(size)
    for n in range(-half, half + 1):
        if n == 0:
            continue
        h[n + half] = 1 / (np.pi * n)
    return h

def Convolution_HilbertTransform(input_signal, impulse_response, output_signal):
    print("Performing the Hilbert transform on the original signal.")
    for m in range(CHIRP_SIGNAL_SIZE):
        for i in range(HILBERT_IMPULSE_RESPONSE_SIZE):
            n = m + i
            if n < HILBERT_TRANSFORM_RESULT_SIZE:
                output_signal[n] += input_signal[m] * impulse_response[i]

def AnalyticSignal_Create():  
    print("Creating the analytic signal by combining the original signal as real component and the Hilbert transform as the imaginary component.")
    global analytic_signal
    global lowpass_output_trimmed, hilbert_transform_result_trimmed
    analytic_signal = lowpass_output_trimmed + 1j * hilbert_transform_result_trimmed

def AnalyticSignal_ComputeInstantaneousAmplitude():
    print("Compute the instantaneous amplitude from the analytic signal.")
    global amplitude_envelope
    global analytic_signal
    amplitude_envelope = np.abs(analytic_signal)

def AnalyticSignal_ComputeInstantaneousFrequency():
    print("Compute the instantaneous frequency from the analytic signal.")
    global instantaneous_frequency
    global analytic_signal, dt
    instantaneous_phase = np.unwrap(np.angle(analytic_signal))
    instantaneous_frequency = np.gradient(instantaneous_phase, dt) / (2 * np.pi)

def AnalyticSignal_ComputeInstantaneousPhase():
    print("Compute the instantaneous phase from the analytic signal.")
    global instantaneous_phase
    global analytic_signal
    instantaneous_phase = np.unwrap(np.angle(analytic_signal))
    
def main():
    global lowpass_output_trimmed, hilbert_transform_result_trimmed

    # 1. Low Pass Filter the mixed Tx/Rx chirp
    lpf_kernel = ImpulseResponse_Create_FIR_LowPass(cutoff_hz, sample_rate, numtaps)
    Convolution_LowPassFilter(chirp_signal_mixed, lpf_kernel, lowpass_output_signal)
    start = (numtaps - 1) // 2
    lowpass_output_trimmed = lowpass_output_signal[start:start + len(chirp_signal_mixed)]
    
    # 2. Range FFT
    N = len(lowpass_output_trimmed)
    freqs = np.fft.rfftfreq(N, dt)  # Only positive frequencies
    fft_result = np.fft.rfft(lowpass_output_trimmed)
    magnitude_spectrum = np.abs(fft_result)
    
    # Find peak for marker
    peak_idx = np.argmax(magnitude_spectrum)
    peak_freq = freqs[peak_idx]
    peak_mag = magnitude_spectrum[peak_idx]

    # 3. Hilbert transform
    hilbert_impulse_response = ImpulseResponse_Create_HilbertTransform(HILBERT_IMPULSE_RESPONSE_SIZE)
    Convolution_HilbertTransform(lowpass_output_trimmed, hilbert_impulse_response, hilbert_transform_result)
    
    # 4. Trim the Hilbert transform result to match the input signal length
    start = (HILBERT_IMPULSE_RESPONSE_SIZE - 1) // 2
    end = start + CHIRP_SIGNAL_SIZE
    hilbert_transform_result_trimmed = hilbert_transform_result[start:end]

    # 5. Create the analytic signal
    AnalyticSignal_Create()
    
    # 6. Instantaneous amplitude (envelope), frequency and phase and acquisition
    AnalyticSignal_ComputeInstantaneousAmplitude()
    AnalyticSignal_ComputeInstantaneousPhase()
    AnalyticSignal_ComputeInstantaneousFrequency()
    expected_instantaneous_frequency = f_start + k * t

    # 7. Plotting
    plt.rcParams.update({
        'figure.facecolor': '#2e2e2e',
        'axes.facecolor': '#3c3c3c',
        'savefig.facecolor': '#2e2e2e',
        'text.color': 'white',
        'axes.labelcolor': 'white',
        'xtick.color': 'white',
        'ytick.color': 'white',
        'axes.edgecolor': 'white',
        'grid.color': '#555555',
        'legend.facecolor': '#3c3c3c',
        'legend.edgecolor': 'white',
        'legend.labelcolor': 'white',
    })
    
    fig, axes = plt.subplots(nrows=8, ncols=1, figsize=(20, 12), sharex=False)
    fig.suptitle("Radar signal mixing and signal property acquisition", fontsize=16)

    axes[0].set_title("Chirp Tx signal (440Hz - 10KHz)")
    axes[0].plot(t, chirp_signal_tx, color="blue")
    axes[0].set_ylabel("Amplitude")
    axes[0].grid(True)

    axes[1].set_title("Chirp Rx signal (lagging by 90°)")
    axes[1].plot(t, chirp_signal_rx, color="orange")
    axes[1].set_ylabel("Amplitude")
    axes[1].grid(True)

    axes[2].set_title("Mixed Tx/Rx signal and Beat Approximation")
    axes[2].plot(t, chirp_signal_mixed, label="Mixed Tx/Rx", color="purple")
    axes[2].plot(t, chirp_signal_mixed_beat_approximation, label="Beat Approx.", color="#DFFF00", linestyle="--")
    axes[2].set_ylabel("Amplitude")
    axes[2].legend(loc='upper right', bbox_to_anchor=(1, 0.85))
    axes[2].grid(True)

    axes[3].set_title("Low pass filtered mixed Tx/Rx signal")
    axes[3].plot(t, lowpass_output_trimmed, label="Filtered mixed Tx/Rx", color="purple")
    axes[3].set_ylabel("Amplitude")
    axes[3].grid(True)
    
    axes[4].set_title("FFT Magnitude Spectrum of Low Pass Filtered Mixed Signal")
    axes[4].plot(freqs, magnitude_spectrum, color="#00CED1")

    # Add peak marker and annotation
    axes[4].plot(peak_freq, peak_mag, 'ro')  # red circle marker
    axes[4].annotate(f"{peak_freq:.1f} Hz", 
                     xy=(peak_freq, peak_mag), 
                     xytext=(peak_freq + 50, peak_mag + 80),
                     color='red',
                     arrowprops=dict(facecolor='red', shrink=0.05, width=1, headwidth=5))

    axes[4].set_ylabel("Magnitude")
    axes[4].set_xlabel("Frequency (Hz)")
    axes[4].grid(True)
    axes[4].set_xlim(0, 2000)  # limit x-axis for better visualization
    
    axes[5].set_title("Hilbert Transform of Mixed Signal (+90° phase shift)")
    axes[5].plot(t, hilbert_transform_result_trimmed, color="green")
    axes[5].set_ylabel("Amplitude")
    axes[5].grid(True)

    axes[6].set_title("Analytic Signal (Real + j * Imag)")
    axes[6].plot(t, np.real(analytic_signal), label="Real (Tx/Rx)", color="purple")
    axes[6].plot(t, np.imag(analytic_signal), label="Imag (Hilbert)", color="green", linestyle="--")
    axes[6].legend(loc='upper right', bbox_to_anchor=(1, 0.85))
    axes[6].set_ylabel("Amplitude")
    axes[6].grid(True)

    axes[7].set_title("Envelope, Phase and Frequency from Analytic Signal")
    axes[7].plot(t, amplitude_envelope, label="Envelope", color="#DFFF00")
    axes[7].set_ylabel("Amplitude", color="#DFFF00")
    axes[7].tick_params(axis='y', labelcolor='#DFFF00')
    ax_phase = axes[7].twinx()
    ax_phase.plot(t, instantaneous_phase, label="Phase", color="#CD607E", linestyle="--")
    ax_phase.set_ylabel("Phase (radians)", color="#CD607E")
    ax_phase.tick_params(axis='y', labelcolor='#CD607E')
    ax_phase.set_yticks([phi])
    ax_phase.set_yticklabels([f"{phi:.2f}"])
    ax_freq = axes[7].twinx()
    ax_freq.spines["right"].set_position(("axes", 1.05))
    ax_freq.plot(t, expected_instantaneous_frequency, color="#00CED1", linestyle="--", label="Expected")
    ax_freq.set_ylabel("Freq (Hz)", color="#00CED1")
    ax_freq.tick_params(axis='y', labelcolor='#00CED1')
    ax_freq.set_ylim(f_start - 100, f_end + 100)
    ax_freq.set_yticks([f_start, f_end])
    
    axes[7].set_xlabel("Time (s)")
    axes[7].grid(True)

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    
    mng = plt.get_current_fig_manager()
    try:
        mng.window.state('zoomed')
    except AttributeError:
        try:
            mng.window.showMaximized()
        except AttributeError:
            mng.resize(*mng.window.maxsize())
    
    plt.show()

if __name__ == "__main__":
    main()
