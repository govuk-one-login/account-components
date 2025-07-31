# Deployment

## Base stacks

The base stacks for this application are managed through Terraform.
We deploy this Terraform manually in each account.

You'll need Terraform installed first (we recommend using [tfenv](https://github.com/tfutils/tfenv)).

Use TEAM to get AWS permissions to deploy to all environments other than `dev`.
You'll need to request the admin role, not power user.

You can add the following section to your `~/.aws/config` file to use this role as a CLI profile (note the `-admin` suffix):

```
[profile di-account-components-build-admin]
sso_session = one-login
sso_account_id = 629382882013
sso_role_name = ApprovedAdmin
region = eu-west-2
sso_region = eu-west-2
sso_start_url = https://uk-digital-identity.awsapps.com/start
```

To deploy the Terraform (in build) run:

```sh
cd infra
AWS_PROFILE=di-account-components-build-admin
aws sso login
terraform init -backend-config=env/deploy/build.tfbackend
terraform plan -var-file=env/build.tfvars
terraform apply -var-file=env/build.tfvars
```

> [!NOTE]
> You'll get a warning about an existing backend when running `terraform init`
> if you've already initialised a backend for a different environment.
>
> You should re-run your command with the `-reconfigure` flag as we don't want
> to migrate state between environments:
>
> `terraform init -backend-config=env/deploy/dev.tfbackend -reconfigure`
