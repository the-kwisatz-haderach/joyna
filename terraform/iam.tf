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

resource "google_project_iam_member" "gke_container_defaultNodeServiceAccount" {
  project = var.project_id
  role    = "roles/container.defaultNodeServiceAccount"
  member  = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "Github Actions Pool"
  description               = "Identity pool for github actions workflow authentication"
  disabled                  = false
  project                   = var.project_id

  depends_on = [google_project_iam_member.terraform_deployer_workloadidentitypools_admin]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "gh-actions-provider"
  display_name                       = "Github Actions Provider"
  description                        = "GitHub Actions identity pool provider for workflows"
  disabled                           = false
  attribute_condition                = <<EOT
    assertion.repository_owner_id == "${var.github_repository_owner_id}" &&
    attribute.repository == "${var.github_repository}" &&
    assertion.ref == "refs/heads/main" &&
    assertion.ref_type == "branch"
EOT
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.aud"        = "assertion.aud"
    "attribute.repository" = "assertion.repository"
  }
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# terraform-deployer's existing roles (container.admin, artifactregistry.admin,
# etc.) don't include permission to create service accounts or set IAM policy
# on them - needed below to create github_actions and bind workloadIdentityUser
# to it. Self-grantable since terraform-deployer already has
# resourcemanager.projectIamAdmin.
resource "google_project_iam_member" "terraform_deployer_service_account_admin" {
  project = var.project_id
  role    = "roles/iam.serviceAccountAdmin"
  member  = "serviceAccount:terraform-deployer@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "terraform_deployer_workloadidentitypools_admin" {
  project = var.project_id
  role    = "roles/iam.workloadIdentityPoolAdmin"
  member  = "serviceAccount:terraform-deployer@${var.project_id}.iam.gserviceaccount.com"
}

# The identity GitHub Actions actually impersonates via WIF - kept separate
# from terraform-deployer (least privilege: pushing images needs nothing
# close to what applying Terraform needs).
resource "google_service_account" "github_actions" {
  project      = var.project_id
  account_id   = "github-actions-deployer"
  display_name = "GitHub Actions image deployer"
  description  = "Impersonated via Workload Identity Federation by GitHub Actions to push images to Artifact Registry"

  depends_on = [google_project_iam_member.terraform_deployer_service_account_admin]
}

# Grants only identities whose mapped attribute.repository matches this repo
# permission to impersonate the SA above - a second, independent scoping
# layer beyond the provider's attribute_condition.
resource "google_service_account_iam_member" "github_actions_wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/${var.github_repository}"
}

resource "google_service_account_iam_member" "github_actions_token_creator" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/${var.github_repository}"
}

resource "google_project_iam_member" "github_actions_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

