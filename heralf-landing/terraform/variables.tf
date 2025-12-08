variable "aws_region" {
  description = "Región de AWS"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "heralf-legal"
}

variable "contact_email" {
  description = "Email para notificaciones y SES"
  type        = string
  default     = "hernan244s@gmail.com"  # CAMBIA ESTO
}

# Nuevas variables para CloudFront
variable "cloudfront_price_class" {
  description = "Clase de precio de CloudFront"
  type        = string
  default     = "PriceClass_100"  # Solo Norteamérica y Europa (más barato)
}

variable "enable_cloudfront" {
  description = "Habilitar CloudFront para el sitio web"
  type        = bool
  default     = true
}