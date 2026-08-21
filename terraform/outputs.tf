output "cluster_name" {
  description = "Name of the GKE Autopilot cluster."
  value       = google_container_cluster.primary.name
}

output "artifact_registry_repository_url" {
  description = "Base URL for pushing/pulling images from the Artifact Registry repository."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repo_name}"
}

output "kubectl_connect_command" {
  description = "Command to fetch cluster credentials and configure kubectl."
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --region ${var.region} --project ${var.project_id}"
}
