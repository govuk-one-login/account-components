# Despite what SonarQube says both the tag and sha digest are needed:
# the digest pins the exact image for reproducibility,
# the tag allows Dependabot to evaluate version constraints
FROM public.ecr.aws/amazonlinux/amazonlinux:2023-minimal@sha256:75a2d4226d9b98c914d7eed878a03bef4f365ad548be5d28d464ccba504cec79

ARG RPM_ARCH

# checkov:skip=CKV_DOCKER_4: "Ensure that COPY is used instead of ADD in Dockerfiles" - this is a legimiate use of the ADD command
ADD https://downloads.aws.com/aws-emulator/packages/aws-emulator/LTS/latest/aws-emulator-${RPM_ARCH}.rpm /tmp/aws-emulator.rpm

RUN rpm -i /tmp/aws-emulator.rpm && rm /tmp/aws-emulator.rpm \
    && mkdir -p /home/emulator && chown 1000 /home/emulator

USER 1000

ENV HOME=/home/emulator \
    EMULATOR_BIND_ADDRESS=0.0.0.0 \
    EMULATOR_TELEMETRY=off

HEALTHCHECK NONE

ENTRYPOINT ["aws-emulator"]