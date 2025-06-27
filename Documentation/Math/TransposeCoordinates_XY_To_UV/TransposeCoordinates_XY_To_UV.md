# Transpose Radar coordinates (XY) to Spotlight coordinates (UV)
The following images show coordinate transposition from XY to UV and UV to XY.
This matrix/vector multiplication can be used to transpose the coordinates relative to the radar,
to coordinates which are relative to the spotlight.
2 variables need to be known before one can use this matrix/vector mulitplication:
- The angle of rotation between the radar and the spotlight
- The XY translation of the spot, relative to the radar

![TransposeCoordinatesXY_UV_1](https://github.com/user-attachments/assets/df9b2b6d-0015-4709-aa2f-0198593dd439)
![TransposeCoordinatesXY_UV_2](https://github.com/user-attachments/assets/d1ba6251-c2e8-4ce3-ad47-4e1e9342fe9f)
![TransposeCoordinatesXY_UV_3](https://github.com/user-attachments/assets/717a5619-e31a-490a-a51a-2dc02f0974da)
