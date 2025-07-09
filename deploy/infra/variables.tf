variable "environment" {
  description = "The environment to deploy the resources"
  type        = string
}

variable "region" {
  description = "The region to deploy the resources"
  type        = string
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
}
