
# FMCW Radar Signal Simulation Explanation

## FMCW Chirp Signals

### Transmitted Signal (TX)

The transmitted FMCW chirp is typically modeled as:
```
T(t) = sin(2 * pi * (f * t + (k / 2) * t^2))
```
- f = start frequency (Hz)  
- k = chirp slope (Hz/s)  
- t = time (s)  

The frequency increases linearly over time with slope k.

---

### Received Signal (RX)

The received signal is a delayed version of the transmitted signal, due to the round-trip time delay \(\tau\) from the target:
```
R(t) = sin(2 * pi * (f * (t - tau) + (k / 2) * (t - tau)^2 ))
```
- tau = time delay proportional to target distance (s)

---

## Mixing and Beat Frequency

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

The **beat frequency** (f_b is approximately:
```
f_b = k * tau
```
which is proportional to the time delay tau.

---

### Beat Signal Approximation
```
y(t) = cos ( 2 * pi * (f * tau + k * tau * t))
```
- The instantaneous beat frequency increases linearly with time, proportional to \(\tau\).  
- This frequency is used to calculate the distance \(d\) to the target:

```
d = (c * tau) / 2 = (c * f_b / (2 * k))
```

where c is the speed of light.

---

## Desmos Simulation Notes

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

## Why the Frequency and Phase Are Subtracted in TI Documentation

- Mixing signals corresponds to multiplying their waveforms.
- This multiplication creates sum and difference frequencies.
- The **difference frequency** (subtraction of frequencies and phases) carries the range information.
- The sum frequency is removed by filtering.

---

# Summary Table

| Concept            | Expression                                            | Physical Meaning                                 |
|--------------------|-------------------------------------------------------|--------------------------------------------------|
| TX Signal          | sin(2 * pi * (f * t + (k / 2) * t^2))                 | Transmitted chirp with linear frequency increase |
| RX Signal          | sin(2 * pi * (f * (t - tau) + (k / 2) * (t - tau)^2)) | Received delayed chirp                           |
| Mixer Output       | T(t) * R(t)                                           | Product containing beat frequency                |
| Beat Frequency     | f_b = k * tau                                         | Frequency proportional to target distance        |
| Range Calculation  | d = (c * f_b) / (2 * k)                               | Distance to target                               |

---
