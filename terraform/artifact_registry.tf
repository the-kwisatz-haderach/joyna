resource "google_artifact_registry_repository" "joyna" {
  location               = var.region
  repository_id          = var.artifact_repo_name
  format                 = "DOCKER"
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "259200s"
    }
  }
  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      package_name_prefixes = ["frontend", "api", "migrate"]
      keep_count            = 5
    }
  }
  cleanup_policies {
    id     = "delete-old-versions"
    action = "DELETE"

    condition {
      tag_state             = "TAGGED"
      older_than            = "432000s"
      package_name_prefixes = ["frontend", "api", "migrate"]
    }
  }
  depends_on = [google_project_service.apis]
}
