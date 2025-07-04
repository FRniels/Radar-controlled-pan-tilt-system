
# FMCW Radar Signal Simulation Explanation

## FMCW Chirp Signals

### Transmitted Signal (TX)

The transmitted FMCW chirp is typically modeled as:

\[
T(t) = \sin\left(2\pi \left(f_0 t + \frac{k}{2} t^2\right)\right)
\]

- \( f_0 \) = start frequency (Hz)  
- \( k \) = chirp slope (Hz/s)  
- \( t \) = time (s)  

The frequency increases linearly over time with slope \(k\).

---

### Received Signal (RX)

The received signal is a delayed version of the transmitted signal, due to the round-trip time delay \(\tau\) from the target:

\[
R(t) = \sin\left(2\pi \left(f_0 (t - \tau) + \frac{k}{2} (t - \tau)^2 \right) \right)
\]

- \(\tau\) = time delay proportional to target distance

---

## Mixing and Beat Frequency

In an FMCW radar system, the **mixer** multiplies TX and RX signals:

\[
y(t) = T(t) \times R(t)
\]

Using the trigonometric identity:

\[
\sin(a) \sin(b) = \frac{1}{2} [ \cos(a - b) - \cos(a + b) ]
\]

The product yields two components:

- **Difference frequency component** \(\cos(a - b)\): contains the target range information  
- **Sum frequency component** \(\cos(a + b)\): filtered out by low-pass filtering

The **beat frequency** \(f_b\) is approximately:

\[
f_b = k \tau
\]

which is proportional to the time delay \(\tau\).

---

### Beat Signal Approximation

\[
y(t) \approx \cos \left( 2\pi (f_0 \tau + k \tau t) \right)
\]

- The instantaneous beat frequency increases linearly with time, proportional to \(\tau\).  
- This frequency is used to calculate the distance \(d\) to the target:

\[
d = \frac{c \cdot \tau}{2} = \frac{c \cdot f_b}{2k}
\]

where \(c\) is the speed of light.

---

## Desmos Simulation Notes

- The **TX chirp** can be plotted as:

```desmos
T(x) = \sin\left(2 \pi \left(f_0 x + \frac{k}{2} x^2\right)\right)
```

- The **RX chirp** is the delayed version:

```desmos
R(x) = \sin\left(2 \pi \left(f_0 (x - \tau) + \frac{k}{2} (x - \tau)^2 \right)\right)
```

- Simply plotting \(T(x) + R(x)\) shows interference but **does not model the radar beat frequency** correctly.

- The proper radar mixer output is the product:

```desmos
Y(x) = T(x) \times R(x)
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

| Concept            | Expression                                     | Physical Meaning                          |
|--------------------|------------------------------------------------|------------------------------------------|
| TX Signal          | \( \sin(2\pi(f_0 t + \frac{k}{2} t^2)) \)     | Transmitted chirp with linear frequency increase |
| RX Signal          | \( \sin(2\pi(f_0 (t-\tau) + \frac{k}{2} (t-\tau)^2)) \) | Received delayed chirp                      |
| Mixer Output       | \( T(t) \times R(t) \)                        | Product containing beat frequency          |
| Beat Frequency     | \( f_b = k \tau \)                             | Frequency proportional to target distance |
| Range Calculation  | \( d = \frac{c f_b}{2 k} \)                   | Distance to target                         |

---
