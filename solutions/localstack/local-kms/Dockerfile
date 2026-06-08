#checkov:skip=CKV_DOCKER_3: Not applicable for development image

# Despite what SonarQube says both the tag and sha digest are needed:
# the digest pins the exact image for reproducibility,
# the tag allows Dependabot to evaluate version constraints
FROM nsmithuk/local-kms:latest@sha256:e070866476b20973a9e23a9b636204b7a222e4169a6e03198d27b80d47ed28e3

HEALTHCHECK NONE