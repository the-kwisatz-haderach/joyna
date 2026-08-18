data "google_project" "current" {
  project_id = var.project_id
}

# GKE Autopilot nodes pull images using the project's default Compute Engine
# service account unless a custom node SA is configured. Grant it registry
# read access so image pulls from Artifact Registry succeed.
resource "google_project_iam_member" "gke_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}
