variable "project_id" {
  description = "GCP project ID to deploy into."
  type        = string
}

variable "region" {
  description = "GCP region for the cluster, network, and Artifact Registry."
  type        = string
  default     = "europe-west1"
}

variable "cluster_name" {
  description = "Name of the GKE Autopilot cluster."
  type        = string
  default     = "joyna-dev"
}

variable "network_name" {
  description = "Name of the VPC network created for the cluster."
  type        = string
  default     = "joyna-vpc"
}

variable "artifact_repo_name" {
  description = "Name of the Artifact Registry Docker repository."
  type        = string
  default     = "joyna"
}
