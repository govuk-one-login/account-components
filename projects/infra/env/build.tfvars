environment             = "build"
hosted_zone_domain      = "manage.build.account.gov.uk"
create_build_stacks     = true
signer_allowed_accounts = ["837553126879", "549834518434", "494066295151"]
# TODO once we've deployed the base stacks 
container_signer_key_arn                      = ""
signing_profile_arn                           = ""
signing_profile_version_arn                   = ""
artifact_source_bucket_arn                    = ""
artifact_source_bucket_event_trigger_role_arn = ""
allowed_promotion_accounts                    = []
