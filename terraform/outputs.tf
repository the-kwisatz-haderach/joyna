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

output "github_actions_workload_identity_provider" {
  description = "Full resource name for google-github-actions/auth's workload_identity_provider input."
  value       = "projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github.workload_identity_pool_provider_id}"
}

output "github_actions_service_account_email" {
  description = "Service account email for google-github-actions/auth's service_account input."
  value       = google_service_account.github_actions.email
}
