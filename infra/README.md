# Deployment

## Base stacks

The base stacks for this application are managed through Terraform.
We deploy this Terraform manually in each account.

You'll need Terraform installed first (we recommend using [tfenv](https://github.com/tfutils/tfenv)).

Then make sure you've got your AWS roles configured as documented in [the team manual](https://team-manual.account.gov.uk/teams/home-team/working-on-the-home-team/aws-accounts/#accessing-aws-via-the-command-line-interface-cli).
You'll need to use TEAM to get permissions to deploy to all environments other than `dev`.

To deploy the Terraform run:

```sh
cd infra
AWS_PROFILE=di-account-components-dev
aws sso login
terraform init -backend-config=env/deploy/dev.tfbackend
terraform plan -var-file=env/dev.tfvars
terraform apply -var-file=env/dev.tfvars
```

> [!NOTE]
> You'll get a warning about an existing backend when running `terraform init`
> if you've already initialised a backend for a different environment.
>
> You should re-run your command with the `-reconfigure` flag as we don't want
> to migrate state between environments:
>
> `terraform init -backend-config=env/deploy/dev.tfbackend -reconfigure`
