terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Random suffix para nombres únicos
resource "random_id" "suffix" {
  byte_length = 4
}

# Local values para reutilizar
locals {
  bucket_name = "${var.project_name}-${random_id.suffix.hex}"
}

# 1. Bucket S3 para hosting estático
resource "aws_s3_bucket" "website" {
  bucket = local.bucket_name

  tags = {
    Name        = "${var.project_name}-website"
    Environment = "production"
    Project     = var.project_name
  }
}

# 2. Configuración de hosting estático
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.bucket

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

# 3. Política de acceso público (solo lectura)
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.bucket

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      },
      # Permiso adicional para CloudFront
      {
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.website.iam_arn
        }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}

# 4. Configuración para evitar que el bucket sea público por ACL
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.bucket

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# 5. Subir archivos del sitio web (ACTUALIZADO)
resource "aws_s3_object" "website_files" {
  for_each = fileset("../src/", "**/*.{html,css,js}")  # TODOS los archivos recursivamente desde src/

  bucket = aws_s3_bucket.website.bucket
  key    = each.value
  source = "../src/${each.value}"
  etag   = filemd5("../src/${each.value}")

  content_type = lookup({
    "html" = "text/html",
    "css"  = "text/css",
    "js"   = "application/javascript"
  }, reverse(split(".", each.value))[0], "application/octet-stream")
}

# 6. DynamoDB Table para guardar leads de formularios
resource "aws_dynamodb_table" "leads" {
  name         = "${var.project_name}-leads"
  billing_mode = "PAY_PER_REQUEST"  # ← MODO GRATUITO
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "fecha"
    type = "S"
  }

  # Índices globales secundarios para búsquedas eficientes
  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
    read_capacity   = 1
    write_capacity  = 1
  }

  global_secondary_index {
    name            = "FechaIndex"
    hash_key        = "fecha"
    projection_type = "ALL"
    read_capacity   = 1
    write_capacity  = 1
  }

  tags = {
    Name        = "${var.project_name}-leads"
    Environment = "production"
    Project     = var.project_name
  }
}

# 7. CLOUDFront - Identity para acceso seguro a S3
resource "aws_cloudfront_origin_access_identity" "website" {
  comment = "Acceso a S3 para ${var.project_name}"
}

# 8. CLOUDFront - Distribución para el sitio web
resource "aws_cloudfront_distribution" "website" {
  count = var.enable_cloudfront ? 1 : 0

  origin {
    domain_name = aws_s3_bucket_website_configuration.website.website_endpoint
    origin_id   = "S3-Website-${aws_s3_bucket.website.bucket}.s3-website-${var.aws_region}.amazonaws.com"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Distribución CloudFront para ${var.project_name}"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  aliases = []  # Puedes agregar tu dominio después

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Website-${aws_s3_bucket.website.bucket}.s3-website-${var.aws_region}.amazonaws.com"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    # Políticas de seguridad
    response_headers_policy_id = "67f7725c-6f97-4210-82d7-5512b31e9d03"  # SecurityHeadersPolicy
  }

  # Comportamiento para errores - SPA friendly
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-cloudfront"
    Environment = "production"
    Project     = var.project_name
  }
}

# Outputs para mostrar información importante
output "website_url" {
  value = "http://${aws_s3_bucket.website.bucket}.s3-website-${var.aws_region}.amazonaws.com"
}

output "cloudfront_url" {
  value = var.enable_cloudfront ? "https://${aws_cloudfront_distribution.website[0].domain_name}" : "CloudFront deshabilitado"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.website.bucket
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.leads.name
}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.leads.arn
}

# 9. IAM Role para Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Project = var.project_name
  }
}

# 10. IAM Policy para Lambda
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream", 
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem", 
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.leads.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      # 👇 NUEVOS PERMISOS PARA COGNITO
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# 11. Lambda Function
resource "aws_lambda_function" "form_processor" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-form-processor"
  role            = aws_iam_role.lambda_role.arn
  handler         = "form-processor.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.leads.name
    }
  }

  tags = {
    Project = var.project_name
  }
}

# 12. API Gateway REST (NO HTTP) - MÁS CONFIABLE
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api"
  description = "API REST para HerAlf Legal"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Project = var.project_name
  }
}

# 13. Resource para /formulario
resource "aws_api_gateway_resource" "formulario" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "formulario"
}

# 14. Método POST
resource "aws_api_gateway_method" "post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.formulario.id
  http_method   = "POST"
  authorization = "NONE"
}

# 15. Método OPTIONS para CORS
resource "aws_api_gateway_method" "options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.formulario.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 16. Integration con Lambda
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.formulario.id
  http_method = aws_api_gateway_method.post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.form_processor.invoke_arn
}

# 17. Integration response para OPTIONS (CORS)
resource "aws_api_gateway_integration" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.formulario.id
  http_method = aws_api_gateway_method.options.http_method

  type = "MOCK"
  
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 18. Method response para OPTIONS
resource "aws_api_gateway_method_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.formulario.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# 19. Integration response para OPTIONS
resource "aws_api_gateway_integration_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.formulario.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS,GET'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.options]
}

# 20. Deployment
resource "aws_api_gateway_deployment" "production" {
  depends_on = [
    aws_api_gateway_integration.lambda,
    aws_api_gateway_integration.options
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = "production"

  lifecycle {
    create_before_destroy = true
  }
}

# 21. Lambda permission para REST API
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.form_processor.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_api_gateway_rest_api.main.execution_arn}/*/POST/formulario"
}

# 22. Output para REST API
output "api_gateway_url" {
  value = "${aws_api_gateway_deployment.production.invoke_url}/formulario"
}

# 23. Cognito User Pool para autenticación
resource "aws_cognito_user_pool" "users" {
  name = "${var.project_name}-users"

  # Política de contraseñas seguras
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # Verificación automática de email
  auto_verified_attributes = ["email"]

  # Configuración de MFA (opcional)
  mfa_configuration = "OFF"

  # Esquema de atributos personalizados
  schema {
    name                = "nombre_completo"
    attribute_data_type = "String"
    mutable             = true
    #required            = true
    
    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  schema {
    name                = "telefono"
    attribute_data_type = "String"
    mutable             = true
    #required            = false
    
    string_attribute_constraints {
      min_length = 10
      max_length = 15
    }
  }

  # Configuración de recuperación
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = {
    Project = var.project_name
  }
}

# 24. Cognito User Pool Client (Frontend)
resource "aws_cognito_user_pool_client" "web" {
  name = "${var.project_name}-web-client"

  user_pool_id = aws_cognito_user_pool.users.id

  # Configuración básica de autenticación
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Configuración OAuth simplificada
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = ["email", "openid", "profile"]

  # URLs de callback
  callback_urls = [
    "http://localhost:3000",
    "https://${aws_s3_bucket.website.bucket}.s3-website-${var.aws_region}.amazonaws.com"
  ]

  logout_urls = [
    "http://localhost:3000"
  ]

  supported_identity_providers = ["COGNITO"]

  # Configuración de tokens
  id_token_validity      = 24
  access_token_validity  = 1
  refresh_token_validity = 30

  # Atributos básicos
  read_attributes = [
    "email"
  ]

  write_attributes = [
    "email"
  ]

  # Configuraciones de seguridad
  prevent_user_existence_errors = "ENABLED"
}

# 25. Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-auth"
  user_pool_id = aws_cognito_user_pool.users.id
}

# 26. Cognito Identity Pool (Para acceso a AWS services)
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project_name}-identity-pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id     = aws_cognito_user_pool_client.web.id
    provider_name = aws_cognito_user_pool.users.endpoint
  }
}

# 27. IAM Role para usuarios autenticados
resource "aws_iam_role" "authenticated" {
  name = "${var.project_name}-cognito-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })
}

# 28. Policy para usuarios autenticados
resource "aws_iam_role_policy" "authenticated" {
  name = "${var.project_name}-cognito-policy"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "${aws_s3_bucket.website.arn}/documents/*",
          "${aws_s3_bucket.website.arn}/uploads/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.leads.arn,
          "${aws_dynamodb_table.leads.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "execute-api:Invoke"
        ]
        Resource = [
          "${aws_api_gateway_rest_api.main.execution_arn}/*"
        ]
      }
    ]
  })
}

# 29. Cognito Identity Pool Role Attachment
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated" = aws_iam_role.authenticated.arn
  }
}

# 30. Outputs para Cognito
output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.users.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "cognito_domain" {
  value = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_identity_pool_id" {
  value = aws_cognito_identity_pool.main.id
}