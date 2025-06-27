## THIS IS A GENERATED FILE -- DO NOT EDIT
.configuro: .libraries,er4f linker.cmd package/cfg/mmw_mss_per4f.oer4f

# To simplify configuro usage in makefiles:
#     o create a generic linker command file name 
#     o set modification times of compiler.opt* files to be greater than
#       or equal to the generated config header
#
linker.cmd: package/cfg/mmw_mss_per4f.xdl
	$(SED) 's"^\"\(package/cfg/mmw_mss_per4fcfg.cmd\)\"$""\"C:/Users/11307533/Documents/Programming/TI_IWR1642_boost/SPI_WithMagicWord/out_of_box_1642_mss/Debug/configPkg/\1\""' package/cfg/mmw_mss_per4f.xdl > $@
	-$(SETDATE) -r:max package/cfg/mmw_mss_per4f.h compiler.opt compiler.opt.defs
