terraform {
  required_version = "~> 1.12"

  backend "s3" {
    use_lockfile = true
    encrypt      = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = merge(
      {
        Terraform   = "true"
        Environment = var.environment
      },
    var.tags)
  }
}

resource "aws_iam_user" "rds_engine_lookup" {
  name          = "renovate-rds-engine-lookup"
  force_destroy = true
}

resource "aws_iam_user_policy" "rds_engine_lookup_policy" {
  name = "AllowDBEngineVersionLookup"
  user = aws_iam_user.rds_engine_lookup.name

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "AllowDBEngineVersionLookup",
        Effect = "Allow",
        Action = [
          "rds:DescribeDBEngineVersions"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_access_key" "rds_engine_lookup" {
  user = aws_iam_user.rds_engine_lookup.name
}

output "rds_engine_lookup_access_key_id" {
  value     = aws_iam_access_key.rds_engine_lookup.id
  sensitive = true
}

output "rds_engine_lookup_secret_access_key" {
  value     = aws_iam_access_key.rds_engine_lookup.secret
  sensitive = true
}
