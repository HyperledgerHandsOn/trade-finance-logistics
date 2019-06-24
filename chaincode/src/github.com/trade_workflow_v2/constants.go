package trade_workflow_v2

// Key names
const (
	expKey    = "Exporter"
	ebKey     = "ExportersBank"
	expBalKey = "ExportersAccountBalance"
	impKey    = "Importer"
	ibKey     = "ImportersBank"
	impBalKey = "ImportersAccountBalance"
	carKey    = "Carrier"
	raKey     = "RegulatoryAuthority"
)

// State values
const (
	REQUESTED = "REQUESTED"
	ISSUED    = "ISSUED"
	ACCEPTED  = "ACCEPTED"
)

// Location values
const (
	SOURCE      = "SOURCE"
	DESTINATION = "DESTINATION"
)
