resource "google_compute_network" "vpc" {
  name                    = var.network_name
  auto_create_subnetworks = false

  depends_on = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.network_name}-subnet"
  ip_cidr_range = "10.0.0.0/20"
  region        = var.region
  network       = google_compute_network.vpc.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }
}

# Required for regional external Application Load Balancers (the
# gke-l7-regional-external-managed GatewayClass) - Google's managed
# proxies need a dedicated subnet in the same VPC/region. Not created
# automatically; the Gateway fails to provision without it.
resource "google_compute_subnetwork" "proxy_only" {
  name          = "${var.network_name}-proxy-only"
  ip_cidr_range = "10.9.0.0/23"
  region        = var.region
  network       = google_compute_network.vpc.id
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}
