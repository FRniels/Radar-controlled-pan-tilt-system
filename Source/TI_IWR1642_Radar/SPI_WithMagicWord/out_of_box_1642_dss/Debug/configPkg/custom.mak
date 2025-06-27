## THIS IS A GENERATED FILE -- DO NOT EDIT
.configuro: .libraries,e674 linker.cmd package/cfg/mmw_dss_pe674.oe674

# To simplify configuro usage in makefiles:
#     o create a generic linker command file name 
#     o set modification times of compiler.opt* files to be greater than
#       or equal to the generated config header
#
linker.cmd: package/cfg/mmw_dss_pe674.xdl
	$(SED) 's"^\"\(package/cfg/mmw_dss_pe674cfg.cmd\)\"$""\"C:/Users/11307533/Documents/Programming/TI_IWR1642_boost/SPI_WithMagicWord/out_of_box_1642_dss/Debug/configPkg/\1\""' package/cfg/mmw_dss_pe674.xdl > $@
	-$(SETDATE) -r:max package/cfg/mmw_dss_pe674.h compiler.opt compiler.opt.defs
