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

variable "github_repository" {
  description = "GitHub repository (owner/name) allowed to authenticate via Workload Identity Federation."
  type        = string
  default     = "the-kwisatz-haderach/joyna"
}

variable "github_repository_owner_id" {
  description = "Numeric GitHub owner ID for github_repository (more stable than the owner login, which can be renamed)."
  type        = string
  default     = "31816977"
}
