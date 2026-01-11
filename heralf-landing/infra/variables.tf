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

variable "bedrock_model_id" {
  description = "ID del modelo de Bedrock a usar"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "whatsapp_phone_number_id" {
  description = "ID del número de teléfono de WhatsApp Business"
  type        = string
  default     = "" # Dejar vacío hasta configurar
}

variable "whatsapp_api_version" {
  description = "Versión de la API de WhatsApp"
  type        = string
  default     = "v18.0"
}

variable "whatsapp_verify_token" {
  description = "Token para verificación del webhook de WhatsApp"
  type        = string
  default     = "heralf-legal-token"
  sensitive   = true
}