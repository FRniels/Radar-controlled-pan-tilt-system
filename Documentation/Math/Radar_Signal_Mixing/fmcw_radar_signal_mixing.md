
# FMCW Radar Signal Simulation Explanation

## FMCW Chirp Signals

### Transmitted Signal (TX)
![Math_RadarSignalMixing_Tx](https://github.com/user-attachments/assets/5f122585-831f-4c80-9298-b465e38d1674)

The transmitted FMCW chirp is typically modeled as:
```
T(t) = sin(2 * pi * (f * t + (k / 2) * t^2))
```
- f = start frequency (Hz)  
- k = chirp slope (Hz/s)  
- t = time (s)  

The frequency increases linearly over time with slope **k**.

---

### Received Signal (RX)
![Math_RadarSignalMixing_Rx](https://github.com/user-attachments/assets/57234599-9fa7-4251-b52f-d0f1937621c5)

The received signal is a delayed version of the transmitted signal, due to the round-trip time delay **tau** from the target:
```
R(t) = sin(2 * pi * (f * (t - tau) + (k / 2) * (t - tau)^2 ))
```
- tau = time delay proportional to target distance (s)

---

### Mixing and Beat Frequency
![Math_RadarSignalMixing_Mixed_TxRx](https://github.com/user-attachments/assets/e924bf11-d30a-4bf9-8fa5-3284fd88210e)

In an FMCW radar system, the **mixer** multiplies TX and RX signals:
```
y(x) = T(x) * R(t)
```
Using the trigonometric identity:
```
sin(a) * sin(b) = (1 / 2) * [cos(a - b) - cos(a + b)]
```
The product yields two components:

- **Difference frequency component** cos(a - b): contains the target range information  
- **Sum frequency component** cos(a + b): filtered out by low-pass filtering

The **beat frequency** f_b is approximately:
```
f_b = k * tau
```
which is proportional to the time delay **tau**.

---

#### Beat Signal Approximation
```
y(t) = cos ( 2 * pi * (f * tau + k * tau * t))
```
- The instantaneous beat frequency increases linearly with time, proportional to **tau**.  
- This frequency is used to calculate the distance **d** to the target:

```
d = (c * tau) / 2 = (c * f_b / (2 * k))
```

where **c** is the speed of light.

---

### Plotting Simulation 

- The **TX chirp** can be plotted as:

```
T(x) = sin(2 * pi * (f * x + (k / 2) * x^2))
```

- The **RX chirp** is the delayed version:

```
R(x) = sin(2 * pi * (f * (x - tau) + (k / 2 * (x - tau)^2))
```

- Simply plotting T(x) + R(x) shows interference but **does not model the radar beat frequency** correctly.

- The proper radar mixer output is the product:

```
Y(x) = T(x) * R(x)
```

This produces a **low-frequency envelope** corresponding to the beat signal.

---

### Why the frequency and phase are subtracted in (TI mmWave) radar documentation

- Mixing signals corresponds to multiplying their waveforms.
- This multiplication creates sum and difference frequencies.
- The difference frequency (subtraction of frequencies and phases) carries the range information.
- The sum frequency is removed by filtering.

---

### Audio example
[▶️ Download beat-chirp example](./Radar_Signal_Mixing_Audio_Example.mp3)
[▶️ Download audacity project](./Radar_Signal_Mixing_Audio_Example.aup3)

This is an audio demonstration as an analogy to the signal mixer functionality of the radar.
Two 3s linear chirps are generated:
- Start frequency of 440Hz
- Stop  frequency of 10KHz.
These frequencies and the 3s duration are chosen because of:
- Well within the hearing range of humans.
- A large frequency sweep in a short duration makes it a bit easier to see the linear chirp in the audacity plot.

#### Chirp vs beat frequency
In the audio example, 2 things are important to listen for:
- The overall **audio still sounds as a linear chirp** going up in frequency.
  This is because the **chirp frequency components** are **still present** in the envelope of the mixed signal.
  The linear chirp frequencies can be thought of as the carrier wave.
  These chirp frequency (high frequencies) can be and will be filtered out in radar by using a Low Pass Filter.
- The **envelope of the mixed signal** represents the **Beat Frequency** of the mixed signal.
  Note that the **Beat Frequency** is a **Fixed frequency** , thus a **sinusoid** and not a chirp.
  Listen for a **slow oscillation** in the sound to recognize the **Beat Frequency**.
  Such a **Beat Frequency** can also be produced with mixing 2 sinusoids that are a couple of Hz apart as an intended **audio effect**.

## Summary Table

| Concept            | Expression                                            | Physical Meaning                                 |
|--------------------|-------------------------------------------------------|--------------------------------------------------|
| TX Signal          | sin(2 * pi * (f * t + (k / 2) * t^2))                 | Transmitted chirp with linear frequency increase |
| RX Signal          | sin(2 * pi * (f * (t - tau) + (k / 2) * (t - tau)^2)) | Received delayed chirp                           |
| Mixer Output       | T(t) * R(t)                                           | Product containing beat frequency                |
| Beat Frequency     | f_b = k * tau                                         | Frequency proportional to target distance        |
| Range Calculation  | d = (c * f_b) / (2 * k)                               | Distance to target                               |

---
