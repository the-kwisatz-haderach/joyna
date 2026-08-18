resource "google_artifact_registry_repository" "joyna" {
  location      = var.region
  repository_id = var.artifact_repo_name
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}
