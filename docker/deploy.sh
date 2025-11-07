#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

ERROR_OCCURRED=0

set -a
source .env

# Parse arg
MODE_CHOICE=""
IS_MAINLAND=""
ENABLE_TERMINAL=""
VERSION_CHOICE=""
ROOT_DIR_PARAM=""

# Suppress the orphan warning
export COMPOSE_IGNORE_ORPHANS=True

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE_CHOICE="$2"
      shift 2
      ;;
    --is-mainland)
      IS_MAINLAND="$2"
      shift 2
      ;;
    --enable-terminal)
      ENABLE_TERMINAL="$2"
      shift 2
      ;;
    --version)
      VERSION_CHOICE="$2"
      shift 2
      ;;
    --root-dir)
      ROOT_DIR_PARAM="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

sanitize_input() {
  local input="$1"
  printf "%s" "$input" | tr -d '\r'
}

generate_minio_ak_sk() {
  echo "🔑 Generating MinIO keys..."

  if [ "$(uname -s | tr '[:upper:]' '[:lower:]')" = "mingw" ] || [ "$(uname -s | tr '[:upper:]' '[:lower:]')" = "msys" ]; then
    # Windows
    ACCESS_KEY=$(powershell -Command "[System.Convert]::ToBase64String([System.Guid]::NewGuid().ToByteArray()) -replace '[^a-zA-Z0-9]', '' -replace '=.+$', '' | Select-Object -First 12")
    SECRET_KEY=$(powershell -Command '$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); [System.Convert]::ToBase64String($bytes)')
  else
    # Linux/Mac
    # Generate a random AK (12-character alphanumeric)
    ACCESS_KEY=$(openssl rand -hex 12 | tr -d '\r\n' | sed 's/[^a-zA-Z0-9]//g')

    # Generate a random SK (32-character high-strength random string)
    SECRET_KEY=$(openssl rand -base64 32 | tr -d '\r\n' | sed 's/[^a-zA-Z0-9+/=]//g')
  fi

  if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
    echo "   ❌ ERROR Failed to generate MinIO access keys"
    ERROR_OCCURRED=1
    return 1
  fi

  export MINIO_ACCESS_KEY=$ACCESS_KEY
  export MINIO_SECRET_KEY=$SECRET_KEY

  update_env_var "MINIO_ACCESS_KEY" "$ACCESS_KEY"
  update_env_var "MINIO_SECRET_KEY" "$SECRET_KEY"

  echo "   ✅ MinIO keys generated successfully"
}

generate_jwt() {
  # Function to generate JWT token
  local role=$1
  local secret=$JWT_SECRET
  local now=$(date +%s)
  local exp=$((now + 157680000))

  local header='{"alg":"HS256","typ":"JWT"}'
  local header_base64=$(echo -n "$header" | base64 | tr -d '\n=' | tr '/+' '_-')

  local payload="{\"role\":\"$role\",\"iss\":\"supabase\",\"iat\":$now,\"exp\":$exp}"
  local payload_base64=$(echo -n "$payload" | base64 | tr -d '\n=' | tr '/+' '_-')

  local signature=$(echo -n "$header_base64.$payload_base64" | openssl dgst -sha256 -hmac "$secret" -binary | base64 | tr -d '\n=' | tr '/+' '_-')

  echo "$header_base64.$payload_base64.$signature"
}

generate_supabase_keys() {
  if [ "$DEPLOYMENT_VERSION" = "full" ]; then
    # Function to generate Supabase secrets
    echo "🔑 Generating Supabase keys..."

    # Generate fresh keys on every run for security
    export JWT_SECRET=$(openssl rand -base64 32 | tr -d '[:space:]')
    export SECRET_KEY_BASE=$(openssl rand -base64 64 | tr -d '[:space:]')
    export VAULT_ENC_KEY=$(openssl rand -base64 32 | tr -d '[:space:]')

    # Generate JWT-dependent keys using the new JWT_SECRET
    local anon_key=$(generate_jwt "anon")
    local service_role_key=$(generate_jwt "service_role")

    # Update or add all keys to the .env file
    update_env_var "JWT_SECRET" "$JWT_SECRET"
    update_env_var "SECRET_KEY_BASE" "$SECRET_KEY_BASE"
    update_env_var "VAULT_ENC_KEY" "$VAULT_ENC_KEY"
    update_env_var "SUPABASE_KEY" "$anon_key"
    update_env_var "SERVICE_ROLE_KEY" "$service_role_key"

    # Reload the environment variables from the updated .env file
    source .env
    echo "   ✅ Supabase keys generated successfully"
  fi
}


generate_elasticsearch_api_key() {
  # Function to generate Elasticsearch API key
  wait_for_elasticsearch_healthy || { echo "   ❌ Elasticsearch health check failed"; exit 1; }

  # Generate API key
  echo "🔑 Generating ELASTICSEARCH_API_KEY..."
  API_KEY_JSON=$(docker exec nexent-elasticsearch curl -s -u "elastic:$ELASTIC_PASSWORD" "http://localhost:9200/_security/api_key" -H "Content-Type: application/json" -d '{"name":"my_api_key","role_descriptors":{"my_role":{"cluster":["all"],"index":[{"names":["*"],"privileges":["all"]}]}}}')

  # Extract API key and add to .env
  ELASTICSEARCH_API_KEY=$(echo "$API_KEY_JSON" | grep -o '"encoded":"[^"]*"' | awk -F'"' '{print $4}')
  echo "✅ ELASTICSEARCH_API_KEY Generated: $ELASTICSEARCH_API_KEY"
  if [ -n "$ELASTICSEARCH_API_KEY" ]; then
    update_env_var "ELASTICSEARCH_API_KEY" "$ELASTICSEARCH_API_KEY"
  fi
}

generate_env_for_infrastructure() {
  # Function to generate complete environment file for infrastructure mode using generate_env.sh
  echo "🔑 Generating complete environment file in root directory..."
  echo "   🚀 Running generate_env.sh..."

  # Check if generate_env.sh exists
  if [ ! -f "generate_env.sh" ]; then
      echo "   ❌ ERROR generate_env.sh not found in docker directory"
      return 1
  fi

  # Make sure the script is executable and run it
  chmod +x generate_env.sh
  
  # Export DEPLOYMENT_VERSION to ensure generate_env.sh can access it
  export DEPLOYMENT_VERSION
  
  if ./generate_env.sh; then
      echo "   ✅ Environment file generated successfully for infrastructure mode!"
      # Source the generated .env file to make variables available
      if [ -f "../.env" ]; then
          echo "   ⏏️ Sourcing generated root .env file..."
          set -a
          source ../.env
          set +a
          echo "   ✅ Environment variables loaded from ../.env"
      else
          echo "   ⚠️  Warning: ../.env file not found after generation"
          return 1
      fi
  else
      echo "   ❌ ERROR Failed to generate environment file"
      return 1
  fi

  echo ""
  echo "--------------------------------"
  echo ""
}

get_compose_version() {
  # Function to get the version of docker compose
  if command -v docker &> /dev/null; then
      version_output=$(docker compose version 2>/dev/null)
      if [[ $version_output =~ (v[0-9]+\.[0-9]+\.[0-9]+) ]]; then
          echo "v2 ${BASH_REMATCH[1]}"
          return 0
      fi
  fi

  if command -v docker-compose &> /dev/null; then
      version_output=$(docker-compose --version 2>/dev/null)
      if [[ $version_output =~ ([0-9]+\.[0-9]+\.[0-9]+) ]]; then
          echo "v1 ${BASH_REMATCH[1]}"
          return 0
      fi
  fi

  echo "unknown"
  return 1
}

disable_dashboard() {
  update_env_var "DISABLE_RAY_DASHBOARD" "true"
  update_env_var "DISABLE_CELERY_FLOWER" "true"
}

select_deployment_mode() {
  echo "🎛️  Please select deployment mode:"
  echo "   1) 🛠️  Development mode - Expose all service ports for debugging"
  echo "   2) 🏗️  Infrastructure mode - Only start infrastructure services"
  echo "   3) 🚀 Production mode - Only expose port 3000 for security"

  if [ -n "$MODE_CHOICE" ]; then
    mode_choice="$MODE_CHOICE"
    echo "👉 Using mode_choice from argument: $mode_choice"
  else
    read -p "👉 Enter your choice [1/2/3] (default: 1): " mode_choice
  fi

  # Sanitize potential Windows CR in input
  mode_choice=$(sanitize_input "$mode_choice")
  
  case $mode_choice in
      2)
          export DEPLOYMENT_MODE="infrastructure"
          export COMPOSE_FILE_SUFFIX=".yml"
          echo "✅ Selected infrastructure mode 🏗️"
          ;;
      3)
          export DEPLOYMENT_MODE="production"
          export COMPOSE_FILE_SUFFIX=".prod.yml"
          disable_dashboard
          echo "✅ Selected production mode 🚀"
          ;;
      *)
          export DEPLOYMENT_MODE="development"
          export COMPOSE_FILE_SUFFIX=".yml"
          echo "✅ Selected development mode 🛠️"
          ;;
  esac
  echo ""
  
  if [ -n "$ROOT_DIR_PARAM" ]; then
  # Check if root-dir parameter is provided (highest priority)
    ROOT_DIR="$ROOT_DIR_PARAM"
    echo "   📁 Using ROOT_DIR from parameter: $ROOT_DIR"
    # Write to .env file
    if grep -q "^ROOT_DIR=" .env; then
      # Update existing ROOT_DIR in .env
      sed -i "s|^ROOT_DIR=.*|ROOT_DIR=\"$ROOT_DIR\"|" .env
    else
      # Add new ROOT_DIR to .env
      echo "# Root dir" >> .env
      echo "ROOT_DIR=\"$ROOT_DIR\"" >> .env
    fi
  elif grep -q "^ROOT_DIR=" .env; then
  # Check if ROOT_DIR already exists in .env (second priority)
    # Extract existing ROOT_DIR value from .env
    env_root_dir=$(grep "^ROOT_DIR=" .env | cut -d'=' -f2 | sed 's/^"//;s/"$//')
    ROOT_DIR="$env_root_dir"
    echo "   📁 Use existing ROOT_DIR path: $env_root_dir"
  
  else
  # Use default value and prompt user input (lowest priority)
    default_root_dir="$HOME/nexent-data"
    read -p "   📁 Enter ROOT_DIR path (default: $default_root_dir): " user_root_dir
    ROOT_DIR="${user_root_dir:-$default_root_dir}"

    echo "# Root dir" >> .env
    echo "ROOT_DIR=\"$ROOT_DIR\"" >> .env
  fi
  echo ""
  echo "--------------------------------"
  echo ""
}

clean() {
  export MINIO_ACCESS_KEY=
  export MINIO_SECRET_KEY=
  export DEPLOYMENT_MODE=
  export COMPOSE_FILE_SUFFIX=
  export DEPLOYMENT_VERSION=

  if [ -f ".env.bak" ]; then
    rm .env.bak
  fi
  if [ -f "../.env.bak" ]; then
    rm ../.env.bak
  fi
}

update_env_var() {
  # Function to update or add a key-value pair to .env
  local key="$1"
  local value="$2"
  local env_file=".env"

  # Ensure the .env file exists
  touch "$env_file"

  if grep -q "^${key}=" "$env_file"; then
    # Key exists, so update it. Escape \ and & for sed's replacement string.
    # Use ~ as the separator to avoid issues with / in the value.
    local escaped_value=$(echo "$value" | sed -e 's/\\/\\\\/g' -e 's/&/\\&/g')
    sed -i.bak "s~^${key}=.*~${key}=\"${escaped_value}\"~" "$env_file"
  else
    # Key doesn't exist, so add it
    echo "${key}=\"${value}\"" >> "$env_file"
  fi

}

create_dir_with_permission() {
  # Function to create a directory and set permissions
  local dir_path="$1"
  local permission="$2"

  # Check if parameters are provided
  if [ -z "$dir_path" ] || [ -z "$permission" ]; then
      echo "   ❌ ERROR Directory path and permission parameters are required." >&2
      ERROR_OCCURRED=1
      return 1
  fi

  # Create the directory if it doesn't exist
  if [ ! -d "$dir_path" ]; then
      mkdir -p "$dir_path"
      if [ $? -ne 0 ]; then
          echo "   ❌ ERROR Failed to create directory $dir_path." >&2
          ERROR_OCCURRED=1
          return 1
      fi
  fi

  # Set directory permissions
  if chmod -R "$permission" "$dir_path" 2>/dev/null; then
      echo "   📁 Directory $dir_path has been created and permissions set to $permission."
  fi
}

prepare_directory_and_data() {
  # Initialize the sql script permission
  chmod 644 "init.sql"

  echo "🔧 Creating directory with permission..."
  create_dir_with_permission "$ROOT_DIR/elasticsearch" 775
  create_dir_with_permission "$ROOT_DIR/postgresql" 775
  create_dir_with_permission "$ROOT_DIR/minio" 775
  create_dir_with_permission "$ROOT_DIR/redis" 775

  cp -rn volumes $ROOT_DIR
  chmod -R 775 $ROOT_DIR/volumes
  echo "   📁 Directory $ROOT_DIR/volumes has been created and permissions set to 775."

  # Create nexent user workspace directory
  NEXENT_USER_DIR="$HOME/nexent"
  create_dir_with_permission "$NEXENT_USER_DIR" 775
  echo "   🖥️  Nexent user workspace: $NEXENT_USER_DIR"

  # Export for docker-compose
  export NEXENT_USER_DIR

  echo ""
  echo "--------------------------------"
  echo ""
}

pull_image_with_enhanced_memory_management() {
  # Enhanced image pull function with aggressive memory management for large images
  local image=$1
  local timeout=${2:-900}  # Default 15 minutes for large images
  local max_retries=${3:-1}  # Only 1 retry for large images to avoid memory issues
  
  echo "   📥 Pulling large image: $image"
  echo "   ⏱️  Timeout: ${timeout}s, Max retries: ${max_retries}"
  
  # Clean up before starting
  docker system prune -f --filter "until=1h" >/dev/null 2>&1 || true
  
  local retry_count=0
  while [ $retry_count -lt $max_retries ]; do
    # Use timeout command to limit pull duration
    if command -v timeout >/dev/null 2>&1; then
      # Linux: use timeout command with background cleanup
      local cleanup_pid=""
      (
        local last_cleanup=$(date +%s)
        while true; do
          sleep 30
          local current_time=$(date +%s)
          if [ $((current_time - last_cleanup)) -ge 30 ]; then
            echo "   🧹 Cleaning up Docker cache to free memory..."
            docker system prune -f --filter "until=30m" >/dev/null 2>&1 || true
            docker image prune -f >/dev/null 2>&1 || true
            last_cleanup=$current_time
          fi
        done
      ) &
      cleanup_pid=$!
      
      if timeout $timeout docker pull "$image" --progress=plain; then
        kill $cleanup_pid 2>/dev/null || true
        echo "   ✅ Successfully pulled: $image"
        return 0
      else
        kill $cleanup_pid 2>/dev/null || true
        local exit_code=${PIPESTATUS[0]}
        if [ $exit_code -eq 124 ]; then
          echo "   ⏱️  Pull timeout after ${timeout}s for: $image"
        else
          echo "   ❌ Pull failed for: $image"
        fi
      fi
    elif command -v gtimeout >/dev/null 2>&1; then
      # macOS: use gtimeout with background cleanup
      local cleanup_pid=""
      (
        local last_cleanup=$(date +%s)
        while true; do
          sleep 30
          local current_time=$(date +%s)
          if [ $((current_time - last_cleanup)) -ge 30 ]; then
            echo "   🧹 Cleaning up Docker cache to free memory..."
            docker system prune -f --filter "until=30m" >/dev/null 2>&1 || true
            docker image prune -f >/dev/null 2>&1 || true
            last_cleanup=$current_time
          fi
        done
      ) &
      cleanup_pid=$!
      
      if gtimeout $timeout docker pull "$image" --progress=plain; then
        kill $cleanup_pid 2>/dev/null || true
        echo "   ✅ Successfully pulled: $image"
        return 0
      else
        kill $cleanup_pid 2>/dev/null || true
        local exit_code=${PIPESTATUS[0]}
        if [ $exit_code -eq 124 ]; then
          echo "   ⏱️  Pull timeout after ${timeout}s for: $image"
        else
          echo "   ❌ Pull failed for: $image"
        fi
      fi
    else
      # Windows or no timeout: manual timeout with aggressive cleanup
      echo "   ⚠️  Warning: timeout command not available, using manual timeout with aggressive cleanup"
      local temp_log=$(mktemp 2>/dev/null || echo "/tmp/docker_pull_$$.log")
      local start_time=$(date +%s)
      
      # Start pull in background
      docker pull "$image" > "$temp_log" 2>&1 &
      local pull_pid=$!
      
      # Monitor and cleanup
      local last_cleanup=$start_time
      while kill -0 $pull_pid 2>/dev/null; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # Check timeout
        if [ $elapsed -ge $timeout ]; then
          echo "   ⏱️  Pull timeout after ${timeout}s, killing process..."
          if [ "$(uname -s | tr '[:upper:]' '[:lower:]')" = "mingw" ] || [ "$(uname -s | tr '[:upper:]' '[:lower:]')" = "msys" ]; then
            taskkill //F //PID $pull_pid >/dev/null 2>&1 || kill $pull_pid 2>/dev/null || true
          else
            kill $pull_pid 2>/dev/null || true
          fi
          break
        fi
        
        # Aggressive cleanup every 30 seconds to prevent memory buildup
        if [ $((current_time - last_cleanup)) -ge 30 ]; then
          echo "   🧹 Cleaning up Docker cache to free memory (elapsed: ${elapsed}s)..."
          # Clean up unused images, containers, and build cache
          docker system prune -f --filter "until=30m" >/dev/null 2>&1 || true
          # Also clean up dangling images
          docker image prune -f >/dev/null 2>&1 || true
          last_cleanup=$current_time
        fi
        
        sleep 5
      done
      
      wait $pull_pid 2>/dev/null || true
      
      # Check if pull succeeded
      if [ -f "$temp_log" ] && grep -q "downloaded\|already up to date\|Pulling\|Downloaded\|Status: Downloaded" "$temp_log" 2>/dev/null; then
        echo "   ✅ Successfully pulled: $image"
        rm -f "$temp_log"
        return 0
      else
        echo "   ❌ Pull failed or timeout for: $image"
        if [ -f "$temp_log" ]; then
          echo "   📋 Last few lines of pull log:"
          tail -5 "$temp_log" 2>/dev/null | sed 's/^/      /' || true
        fi
        rm -f "$temp_log"
      fi
    fi
    
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $max_retries ]; then
      echo "   🔄 Retrying pull ($retry_count/$max_retries)..."
      echo "   🧹 Cleaning up before retry..."
      docker system prune -f --filter "until=1h" >/dev/null 2>&1 || true
      sleep 10
    fi
  done
  
  echo "   ❌ Failed to pull $image after $max_retries attempts"
  echo "   💡 Tip: Try pulling the image manually with: docker pull $image"
  return 1
}

deploy_core_services() {
  # Function to deploy core services
  echo "👀 Starting core services..."
  
  # Pre-pull data process image separately with enhanced memory management
  if [ -n "$NEXENT_DATA_PROCESS_IMAGE" ]; then
    echo "📦 Pre-pulling data process image (this may take a while)..."
    if ! docker image inspect "$NEXENT_DATA_PROCESS_IMAGE" >/dev/null 2>&1; then
      echo "   ℹ️  Image not found locally, starting pull..."
      if ! pull_image_with_enhanced_memory_management "$NEXENT_DATA_PROCESS_IMAGE" 900 1; then
        echo "   ⚠️  Warning: Failed to pre-pull data process image"
        echo "   Will attempt to pull during service startup (may cause longer startup time)"
      fi
    else
      echo "   ✅ Data process image already exists locally"
    fi
    echo ""
  fi
  
  # Pre-pull other core service images
  local compose_file="docker-compose${COMPOSE_FILE_SUFFIX}"
  local core_services=("nexent" "nexent-web")
  for service in "${core_services[@]}"; do
    if ${docker_compose_command} -f "$compose_file" config --services 2>/dev/null | grep -q "^${service}$"; then
      local image_name=$(${docker_compose_command} -f "$compose_file" config 2>/dev/null | \
        grep -A 5 "^  ${service}:" | grep "^    image:" | head -1 | \
        sed 's/.*image: *\(.*\)/\1/' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      if [ -n "$image_name" ]; then
        image_name=$(eval echo "$image_name")
        if ! docker image inspect "$image_name" >/dev/null 2>&1; then
          echo "   📥 Pre-pulling $service image: $image_name"
          pull_image_with_enhanced_memory_management "$image_name" 600 1 || true
        fi
      fi
    fi
  done
  
  # Clean up before starting services
  docker system prune -f --filter "until=1h" >/dev/null 2>&1 || true
  
  if ! ${docker_compose_command} -p nexent -f "$compose_file" up -d nexent nexent-web nexent-data-process; then
    echo "   ❌ ERROR Failed to start core services"
    echo "   💡 If data process image failed to pull, check your network connection and try:"
    echo "      docker pull $NEXENT_DATA_PROCESS_IMAGE"
    exit 1
  fi
}

deploy_infrastructure() {
  # Start infrastructure services (basic services only)
  echo "🔧 Starting infrastructure services..."
  INFRA_SERVICES="nexent-elasticsearch nexent-postgresql nexent-minio redis"
  
  # Add openssh-server if Terminal tool container is enabled
  if [ "$ENABLE_TERMINAL_TOOL_CONTAINER" = "true" ]; then
    # Ensure OPENSSH_SERVER_IMAGE is set and clean
    if [ -z "$OPENSSH_SERVER_IMAGE" ]; then
      echo "   ⚠️  OPENSSH_SERVER_IMAGE not set, using default: nexent/nexent-ubuntu-terminal:latest"
      export OPENSSH_SERVER_IMAGE="nexent/nexent-ubuntu-terminal:latest"
    else
      # Clean the variable: remove whitespace and quotes
      OPENSSH_SERVER_IMAGE=$(echo "$OPENSSH_SERVER_IMAGE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//")
      export OPENSSH_SERVER_IMAGE
    fi
    
    # Validate the image name format
    if [[ ! "$OPENSSH_SERVER_IMAGE" =~ ^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+$ ]] && [[ ! "$OPENSSH_SERVER_IMAGE" =~ ^[a-zA-Z0-9._/-]+$ ]]; then
      echo "   ❌ ERROR Invalid OPENSSH_SERVER_IMAGE format: '$OPENSSH_SERVER_IMAGE'"
      echo "   Using default: nexent/nexent-ubuntu-terminal:latest"
      export OPENSSH_SERVER_IMAGE="nexent/nexent-ubuntu-terminal:latest"
    fi
    
    INFRA_SERVICES="$INFRA_SERVICES nexent-openssh-server"
    echo "🔧 Terminal tool container enabled - openssh-server will be included in infrastructure"
    echo "   📦 Using image: $OPENSSH_SERVER_IMAGE"
    echo "   🔍 DEBUG OPENSSH_SERVER_IMAGE value: '$OPENSSH_SERVER_IMAGE'"
  fi

  if ! ${docker_compose_command} -p nexent -f "docker-compose${COMPOSE_FILE_SUFFIX}" up -d $INFRA_SERVICES; then
    echo "   ❌ ERROR Failed to start infrastructure services"
    exit 1
  fi

  if [ "$ENABLE_TERMINAL_TOOL_CONTAINER" = "true" ]; then
    echo "🔧 Terminal tool container (openssh-server) is now available for AI agents"
  fi

  # Deploy Supabase services based on DEPLOYMENT_VERSION 
  if [ "$DEPLOYMENT_VERSION" = "full" ]; then
      echo ""
      echo "🔧 Starting Supabase services..."
      # Check if the supabase compose file exists
      if [ ! -f "docker-compose-supabase${COMPOSE_FILE_SUFFIX}" ]; then
          echo "   ❌ ERROR Supabase compose file not found: docker-compose-supabase${COMPOSE_FILE_SUFFIX}"
          ERROR_OCCURRED=1
          return 1
      fi
      
      # Start Supabase services
      if ! $docker_compose_command -p nexent -f "docker-compose-supabase${COMPOSE_FILE_SUFFIX}" up -d; then
          echo "   ❌ ERROR Failed to start supabase services"
          ERROR_OCCURRED=1
          return 1
      fi
      
      echo "   ✅ Supabase services started successfully"
  else
      echo "   🚧 Skipping Supabase services..."
  fi

  echo "   ✅ Infrastructure services started successfully"  
}

select_deployment_version() {
  # Function to select deployment version
  echo "🚀 Please select deployment version:"
  echo "   1) ⚡️  Speed version - Lightweight deployment with essential features"
  echo "   2) 🎯  Full version - Full-featured deployment with all capabilities"
  if [ -n "$VERSION_CHOICE" ]; then
    version_choice="$VERSION_CHOICE"
    echo "👉 Using version_choice from argument: $version_choice"
  else
    read -p "👉 Enter your choice [1/2] (default: 1): " version_choice
  fi

  # Sanitize potential Windows CR in input
  version_choice=$(sanitize_input "$version_choice")

  case $version_choice in
      2)
          export DEPLOYMENT_VERSION="full"
          echo "✅ Selected complete version 🎯"
          ;;
      *)
          export DEPLOYMENT_VERSION="speed"
          echo "✅ Selected speed version ⚡️"
          ;;
  esac
  
  # Save the version choice to .env file
  local key="DEPLOYMENT_VERSION"
  local value="$DEPLOYMENT_VERSION"
  local env_file=".env"

  # Ensure the .env file exists
  touch "$env_file"

  if grep -q "^${key}=" "$env_file"; then
    # Key exists, so update it. Escape \ and & for sed's replacement string.
    # Use ~ as the separator to avoid issues with / in the value.
    local escaped_value=$(echo "$value" | sed -e 's/\\/\\\\/g' -e 's/&/\\&/g')
    sed -i.bak "s~^${key}=.*~${key}=\"${escaped_value}\"~" "$env_file"
  else
    # Key doesn't exist, so add it
    echo "${key}=\"${value}\"" >> "$env_file"
  fi
  
  echo ""
  echo "--------------------------------"
  echo ""
}

setup_package_install_script() {
  # Function to setup package installation script
  echo "📝 Setting up package installation script..."
  mkdir -p "openssh-server/config/custom-cont-init.d"

  # Copy the fixed installation script
  if [ -f "openssh-install-script.sh" ]; then
      cp "openssh-install-script.sh" "openssh-server/config/custom-cont-init.d/openssh-start-script"
      chmod +x "openssh-server/config/custom-cont-init.d/openssh-start-script"
      echo "   ✅ Package installation script created/updated"
  else
      echo "   ❌ ERROR openssh-install-script.sh not found"
      ERROR_OCCURRED=1
      return 1
  fi
}

wait_for_elasticsearch_healthy() {
  # Function to wait for Elasticsearch to become healthy
  local retries=0
  local max_retries=${1:-60}  # Default 10 minutes, can be overridden
  while ! ${docker_compose_command} -p nexent -f "docker-compose${COMPOSE_FILE_SUFFIX}" ps nexent-elasticsearch | grep -q "healthy" && [ $retries -lt $max_retries ]; do
      echo "⏳ Waiting for Elasticsearch to become healthy... (attempt $((retries + 1))/$max_retries)"
      sleep 10
      retries=$((retries + 1))
  done

  if [ $retries -eq $max_retries ]; then
      echo "   ⚠️  Warning: Elasticsearch did not become healthy within expected time"
      echo "     You may need to check the container logs and try again"
      return 1
  else
      echo "   ✅ Elasticsearch is now healthy!"
      return 0
  fi
}

select_terminal_tool() {
    # Function to ask if user wants to create Terminal tool container
    echo "🔧 Terminal Tool Container Setup:"
    echo "    Terminal tool allows AI agents to execute shell commands via SSH."
    echo "    This will create an openssh-server container for secure command execution."
    if [ -n "$ENABLE_TERMINAL" ]; then
        enable_terminal="$ENABLE_TERMINAL"
    else
        read -p "👉 Do you want to create Terminal tool container? [Y/N] (default: N): " enable_terminal
    fi

    # Sanitize potential Windows CR in input
    enable_terminal=$(sanitize_input "$enable_terminal")

    if [[ "$enable_terminal" =~ ^[Yy]$ ]]; then
        export ENABLE_TERMINAL_TOOL_CONTAINER="true"
        export COMPOSE_PROFILES="${COMPOSE_PROFILES:+$COMPOSE_PROFILES,}terminal"
        echo "✅ Terminal tool container will be created 🔧"
        echo "   🔧 Creating openssh-server container for secure command execution"
        
        # Ask user to specify directory mapping for container
        default_terminal_dir="/opt/terminal"
        echo "   📁 Terminal container directory mapping:"
        echo "      • Container path: /opt/terminal (fixed)"
        echo "      • Host path: You can specify any directory on your host machine"
        echo "      • Default host path: /opt/terminal (recommended)"
        echo ""
        read -p "   📁 Enter host directory to mount to container (default: /opt/terminal): " terminal_mount_dir
        terminal_mount_dir=$(sanitize_input "$terminal_mount_dir")
        TERMINAL_MOUNT_DIR="${terminal_mount_dir:-$default_terminal_dir}"
        
        # Save to environment variables
        export TERMINAL_MOUNT_DIR
        update_env_var "TERMINAL_MOUNT_DIR" "$TERMINAL_MOUNT_DIR"
        
        echo "   📁 Terminal mount configuration:"
        echo "      • Host: $TERMINAL_MOUNT_DIR"
        echo "      • Container: /opt/terminal"
        echo "      • This directory will be created if it doesn't exist"
        echo ""
        
        # Setup SSH credentials for Terminal tool container
        echo "🔐 Setting up SSH credentials for Terminal tool container..."
        
        # Check if SSH credentials are already set
        if [ -n "$SSH_USERNAME" ] && [ -n "$SSH_PASSWORD" ]; then
            echo "🚧 SSH credentials already configured, skipping setup..."
            echo "👤 Username: $SSH_USERNAME"
            echo "🔑 Password: [HIDDEN]"
        else
            # Prompt for SSH credentials
            echo "Please enter SSH credentials for Terminal tool container:"
            echo ""
            
            # Get SSH username
            if [ -z "$SSH_USERNAME" ]; then
                read -p "SSH Username (default: root): " input_username
                SSH_USERNAME=${input_username:-root}
            fi
            
            # Get SSH password
            if [ -z "$SSH_PASSWORD" ]; then
                echo "SSH Password (will be hidden): "
                read -s input_password
                echo ""
                if [ -z "$input_password" ]; then
                    echo "❌ SSH password cannot be empty"
                    ERROR_OCCURRED=1
                    return 1
                fi
                SSH_PASSWORD="$input_password"
            fi
            
            # Validate credentials
            if [ -z "$SSH_USERNAME" ] || [ -z "$SSH_PASSWORD" ]; then
                echo "❌ Both username and password are required"
                ERROR_OCCURRED=1
                return 1
            fi
            
            # Export environment variables
            export SSH_USERNAME
            export SSH_PASSWORD
            
            # Add to .env file
            update_env_var "SSH_USERNAME" "$SSH_USERNAME"
            update_env_var "SSH_PASSWORD" "$SSH_PASSWORD"
            
            echo "   ✅ SSH credentials configured successfully!"
            echo "      👤 Username: $SSH_USERNAME"
            echo "      🔑 Password: [HIDDEN]"
            echo "      ⚙️  Authentication: Password-based"
        fi
        echo ""
    else
        export ENABLE_TERMINAL_TOOL_CONTAINER="false"
        echo "🚫 Terminal tool container disabled"
    fi
    echo ""
    echo "--------------------------------"
    echo ""
}

create_default_admin_user() {
  echo "🔧 Creating admin user..."
  RESPONSE=$(docker exec nexent bash -c "curl -X POST http://kong:8000/auth/v1/signup -H \"apikey: ${SUPABASE_KEY}\" -H \"Authorization: Bearer ${SUPABASE_KEY}\" -H \"Content-Type: application/json\" -d '{\"email\":\"nexent@example.com\",\"password\":\"nexent@4321\",\"email_confirm\":true,\"data\":{\"role\":\"admin\"}}'" 2>/dev/null)

  if [ -z "$RESPONSE" ]; then
    echo "   ❌ No response received from Supabase."
    return 1
  elif echo "$RESPONSE" | grep -q '"access_token"' && echo "$RESPONSE" | grep -q '"user"'; then
    echo "   ✅ Default admin user has been successfully created."
    echo ""
    echo "      Please save the following credentials carefully, which would ONLY be shown once."
    echo "   📧 Email:    nexent@example.com"
    echo "   🔏 Password: nexent@4321"
  elif echo "$RESPONSE" | grep -q '"error_code":"user_already_exists"' || echo "$RESPONSE" | grep -q '"code":422'; then
    echo "   🚧 Default admin user already exists. Skipping creation."
  else
    echo "   ❌ Response from Supabase does not contain 'access_token' or 'user'."
    return 1
  fi

  echo ""
  echo "--------------------------------"
  echo ""
}

choose_image_env() {
  if [ -n "$IS_MAINLAND" ]; then
    is_mainland="$IS_MAINLAND"
    echo "🌏 Using is_mainland from argument: $is_mainland"
  else
    read -p "🌏 Is your server network located in mainland China? [Y/N] (default N): " is_mainland
  fi

  # Sanitize potential Windows CR in input
  is_mainland=$(sanitize_input "$is_mainland")
  if [[ "$is_mainland" =~ ^[Yy]$ ]]; then
    echo "🌐 Detected mainland China network, using .env.mainland for image sources."
    if [ -f .env.mainland ]; then
      source .env.mainland
    else
      echo "   ❌ ERROR .env.mainland file not found"
      exit 1
    fi
  else
    echo "🌐 Using general image sources from .env.general."
    if [ -f .env.general ]; then
      source .env.general
    else
      echo "   ❌ ERROR .env.general file not found"
      exit 1
    fi
  fi

  # Ensure all image variables are exported and have valid values
  # Remove any leading/trailing whitespace and quotes
  export NEXENT_IMAGE=$(echo "$NEXENT_IMAGE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//")
  export NEXENT_WEB_IMAGE=$(echo "$NEXENT_WEB_IMAGE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//")
  export NEXENT_DATA_PROCESS_IMAGE=$(echo "$NEXENT_DATA_PROCESS_IMAGE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//")
  export ELASTICSEARCH_IMAGE=$(echo "$ELASTICSEARCH_IMAGE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//")
  export POSTGRESQL_IMAGE=$(echo "$POSTGRESQL_IMAGE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//")
  export REDIS_IMAGE=$(echo "$REDIS_IMAGE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//")
  export MINIO_IMAGE=$(echo "$MINIO_IMAGE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//")
  export OPENSSH_SERVER_IMAGE=$(echo "$OPENSSH_SERVER_IMAGE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//")
  
  # Force PostgreSQL image to version 16.0 to match data directory
  if [ -z "$POSTGRESQL_IMAGE" ] || [[ ! "$POSTGRESQL_IMAGE" =~ :16 ]]; then
    # Extract the base image name (e.g., postgres or docker.io/library/postgres)
    if [[ "$POSTGRESQL_IMAGE" =~ ^([^:]+): ]]; then
      local base_image="${BASH_REMATCH[1]}"
      export POSTGRESQL_IMAGE="${base_image}:16.0"
    else
      # Default to postgres:16.0 if pattern doesn't match
      export POSTGRESQL_IMAGE="postgres:16.0"
    fi
    echo "   🔄 Updated PostgreSQL image to: $POSTGRESQL_IMAGE"
  fi

  echo ""
  echo "--------------------------------"
  echo ""
}

main_deploy() {
  # Main deployment function
  echo  "🚀 Nexent Deployment Script 🚀"
  echo ""
  echo "--------------------------------"
  echo ""

  # Select deployment version, mode and image source
  select_deployment_version || { echo "❌ Deployment version selection failed"; exit 1; }
  select_deployment_mode || { echo "❌ Deployment mode selection failed"; exit 1; }
  select_terminal_tool || { echo "❌ Terminal tool container configuration failed"; exit 1; }
  choose_image_env || { echo "❌ Image environment setup failed"; exit 1; }

  # Add permission
  prepare_directory_and_data || { echo "❌ Permission setup failed"; exit 1; }
  generate_minio_ak_sk || { echo "❌ MinIO key generation failed"; exit 1; }


  # Generate Supabase secrets
  generate_supabase_keys || { echo "❌ Supabase secrets generation failed"; exit 1; }

  # Deploy infrastructure services
  deploy_infrastructure || { echo "❌ Infrastructure deployment failed"; exit 1; }

  # Generate Elasticsearch API key
  generate_elasticsearch_api_key || { echo "❌ Elasticsearch API key generation failed"; exit 1; }

  echo ""
  echo "--------------------------------"
  echo ""

  # Special handling for infrastructure mode
  if [ "$DEPLOYMENT_MODE" = "infrastructure" ]; then
    generate_env_for_infrastructure || { echo "❌ Environment generation failed"; exit 1; }
    echo "🎉 Infrastructure deployment completed successfully!"
    echo "     You can now start the core services manually using dev containers"
    echo "     Environment file available at: $(cd .. && pwd)/.env"
    echo "💡 Use 'source .env' to load environment variables in your development shell"
    return 0
  fi

  # Start core services
  deploy_core_services || { echo "❌ Core services deployment failed"; exit 1; }

  echo "   ✅ Core services started successfully"
  echo ""
  echo "--------------------------------"
  echo ""

  # Create default admin user
  if [ "$DEPLOYMENT_VERSION" = "full" ]; then
    create_default_admin_user || { echo "❌ Default admin user creation failed"; exit 1; }
  fi

  echo "🎉  Deployment completed successfully!"
  echo "🌐  You can now access the application at http://localhost:3000"
}

# get docker compose version
version_info=$(get_compose_version)
if [[ $version_info == "unknown" ]]; then
    echo "Error: Docker Compose not found or version detection failed"
    exit 1
fi

# extract version
version_type=$(echo "$version_info" | awk '{print $1}')
version_number=$(echo "$version_info" | awk '{print $2}')

# define docker compose command
docker_compose_command=""
case $version_type in
    "v1")
        echo "Detected Docker Compose V1, version: $version_number"
        # The version ​​v1.28.0​​ is the minimum requirement in Docker Compose v1 that explicitly supports interpolation syntax with default values like ${VAR:-default}
        if [[ $version_number < "1.28.0" ]]; then
            echo "Warning: V1 version is too old, consider upgrading to V2"
            exit 1
        fi
        docker_compose_command="docker-compose"
        ;;
    "v2")
        echo "Detected Docker Compose V2, version: $version_number"
        docker_compose_command="docker compose"
        ;;
    *)
        echo "Error: Unknown docker compose version type."
        exit 1
        ;;
esac

# Execute main deployment with error handling
if ! main_deploy; then
  echo "❌ Deployment failed. Please check the error messages above and try again."
  exit 1
fi

clean
