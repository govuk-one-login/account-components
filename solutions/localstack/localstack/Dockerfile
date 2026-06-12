# Despite what SonarQube says both the tag and sha digest are needed:
# the digest pins the exact image for reproducibility,
# the tag allows Dependabot to evaluate version constraints
FROM localstack/localstack:4.12.0@sha256:0df3a97da57de03a588c05d9b8f390f15c7033fc7c4512f94619d344bc3cd317

USER localstack

HEALTHCHECK NONE