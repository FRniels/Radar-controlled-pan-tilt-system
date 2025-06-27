# invoke SourceDir generated makefile for mmw_mss.per4f
mmw_mss.per4f: .libraries,mmw_mss.per4f
.libraries,mmw_mss.per4f: package/cfg/mmw_mss_per4f.xdl
	$(MAKE) -f C:\Users\11307533\Documents\Programming\TI_IWR1642_boost\SPI_WithMagicWord\out_of_box_1642_mss/src/makefile.libs

clean::
	$(MAKE) -f C:\Users\11307533\Documents\Programming\TI_IWR1642_boost\SPI_WithMagicWord\out_of_box_1642_mss/src/makefile.libs clean

