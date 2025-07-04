# Research the 'Hilbert transform' to extract the beat frequency of the mixed radar signal

## Just applying a low pass filter results in:

Mixing two chirps:

Both sweep from 440 Hz to 10 kHz.

One is delayed slightly in time (say, 90° phase delay of the first cycle).
The result is an amplitude-modulated chirp — the envelope (beat pattern) moves slowly, but the carrier frequency content is still that of a chirp.

So, when applying a low-pass filter, you’re probably doing one of these:

Scenario 1: Filtering the signal directly
You’re filtering the audio, which is still mostly high-frequency content.

The chirp's energy is still in the 440–10kHz band — the beat envelope is not a separate frequency component in the signal you can isolate this way.

So the low-pass filter (even if set around 50 Hz or lower) just removes all content — or doesn't attenuate it if it's too high.

Scenario 2: Trying to extract the envelope
The beat (amplitude modulation) isn't a frequency component you can hear — it’s an envelope over the chirp.

To extract that beat envelope properly, you’d need to demodulate the signal — for example, by computing the absolute value or applying the Hilbert transform — and then low-pass filter that.

This is what radar or audio envelope detectors do.

🎵 What does this mean practically?
You're hearing the carrier (the chirp frequencies) and not the beat frequency envelope. The beat envelope modulates amplitude, but it doesn’t suppress the carrier’s frequency — hence you still hear a chirp.