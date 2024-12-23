// JacaScript test

const pattern = /chart\s*=\s*"(?<depName>[^"\s]+)"\s*chart_version\s*=\s*"(?<currentValue>[^"\s]+)"\s*repository\s*=\s*"(?<registryUrl>[^"\s]+)"/;

const terraformContent = `
module "cluster_secret_store" {
  source = "./modules/addon"

  create = var.enable_external_secrets && var.create_addons

  name          = "cluster-secret-store-aws-secretsmanager"
  chart         = "custom-resources"
  chart_version = "0.1.0"
  repository    = "https://dnd-it.github.io/helm-charts"
  description   = "External Secrets Cluster Secret Store for AWS Secrets Manager"
  namespace     = "external-secrets"
}
`;

const match = terraformContent.match(pattern);

if (match) {
    console.log("Match found:");
    console.log("Chart Name:", match.groups.depName);
    console.log("Chart Version:", match.groups.currentValue);
    console.log("Repository URL:", match.groups.registryUrl);
} else {
    console.log("No match found");
}
