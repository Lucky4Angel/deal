#! /usr/bin/env bash

# Note, only for local it uses prefix as full name to deploy subgraph.
SUBGRAPH_NAME_PREFIX="fluence-deal-contracts"
# Directory with saved deployments. It will append rows with other deployments.
SUBGRAPH_DEPLOYMENTS_DIR="deployments"

help() {
script_name="$(basename $0)"
cat<<HELP
Usage: [BASIC_AUTH_SUBGRAPH] ${script_name} network action
Deploy subgraph to Fluence.

  network       Fluence network to run against - local, stage, dar or kras
  action        action to run - create, deploy or remove

Examples:
  BASIC_AUTH_SUBGRAPH=user:pass ${script_name} stage deploy     Deploy subgraph to stage
  ${script_name} local deploy                                   Deploy subgraph to local
HELP
}

# Print help if no arguments provided
! (($#)) && help && exit 0

# Parse script arguments
while (($#)); do
  case "$1" in
    deploy|create|remove)
      action="$1"
      shift
      ;;
    local|stage|kras|dar)
      network="$1"
      shift
      ;;
    -h|--help)
      help
      exit 0
      ;;
    *)
      echo "Unknown argument '$1'."
      help
      exit 1
  esac
done

# Prepare variables depending on network
case "$network" in
  local)
    GRAPHNODE_URL="${GRAPHNODE_URL:-http://localhost:8020}"
    IPFS_URL="${IPFS_URL:-http://localhost:5001}"
    ;;
  stage)
    if [[ -z $BASIC_AUTH_SUBGRAPH ]]; then
      echo "Please provide credentials with 'BASIC_AUTH_SUBGRAPH' variable."
      exit 1
    else
      basic_auth="${BASIC_AUTH_SUBGRAPH}@"
    fi
    GRAPHNODE_URL="https://${basic_auth}graph-node-admin-${network}.fluence.dev"
    # To save logs of created subgraphs on Fluence stands.
    GRAPH_NODE_QUERY_URL="https://graph-node-${network}.fluence.dev/subgraphs/name/"
    # TODO: IPFS why does not work with auth (before deploy request Tolay to open ports)
    IPFS_URL="https://graph-node-ipfs-${network}.fluence.dev"
    ;;
  kras|dar)
    if [[ -z $BASIC_AUTH_SUBGRAPH ]]; then
      echo "Please provide credentials with 'BASIC_AUTH_SUBGRAPH' variable."
      exit 1
    else
      basic_auth="${BASIC_AUTH_SUBGRAPH}@"
    fi
    GRAPHNODE_URL="https://${basic_auth}graph-node-admin.${network}.fluence.dev"
    # To save logs of created subgraphs on Fluence stands.
    GRAPH_NODE_QUERY_URL="https://graph-node.${network}.fluence.dev/subgraphs/name/"
    # TODO: IPFS why does not work with auth (before deploy request Tolay to open ports)
    IPFS_URL="https://graph-node-ipfs.${network}.fluence.dev"
esac

# Prepare subgraph version label.
SUBGRAPH_VERSION_LABEL="${SUBGRAPH_VERSION_LABEL:-0.0.0}"

# Wait for graph-node to be up
retries=20
echo "Trying to connect to Graph Node at ${GRAPHNODE_URL}..."
while [[ $retries > 0 ]]; do
  status_code=$(curl -o /dev/null -s -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{"foo":"bar"}' ${GRAPHNODE_URL})
  if [[ $status_code == "200" ]]; then
    echo "Succesfully connected to Graph Node."
    sleep 10
    break
  else
    echo "Couldn't connect to Graph Node. Retrying in 5 seconds (retries left: ${retries})"
    sleep 5
    ((retries--))
  fi

  if [[ $retries == 0 ]]; then
    echo "Failed to connect to Graph Node."
    exit 1
  fi
done

# STAND_TO_SUBGRAPH_NETWORK mapping.
# The same as in the scripts/import-config-networks.ts.
# Kinda TODO: locate to 1 place (now it is duplicated in the scripts/import-config-networks.ts as well)
case "$network" in
  local)
    SUBGRAPH_NETWORK="local"
    ;;
  stage)
    SUBGRAPH_NETWORK="stage"
    ;;
  dar)
    SUBGRAPH_NETWORK="dar"
    ;;
  kras)
    SUBGRAPH_NETWORK="kras"
    ;;
esac

echo "Create unique subgraph name for the current state of contract deployments via git commit hash (ignore this suffix for local)..."
case "$network" in
  local|stage|kras|dar)
    SUBGRAPH_NAME="${SUBGRAPH_NAME_PREFIX}"
    ;;
#  TODO: resolve: do we need versioning of subgraph or not finally.
#  stage|kras|dar)
#    SUBGRAPH_NAME="${SUBGRAPH_NAME_PREFIX}-$(git rev-parse --short HEAD)"
#    ;;
esac

case "$action" in
  deploy)
    echo "Deploying subgraph on ${network} stand with subgraph name: $SUBGRAPH_NAME and version label $SUBGRAPH_VERSION_LABEL..."
    auth_header=$(echo -n ${BASIC_AUTH_SUBGRAPH} | base64)
    graph deploy --node ${GRAPHNODE_URL} --headers "{\"Authorization\": \"Basic ${auth_header}\"}" --ipfs ${IPFS_URL} --network ${SUBGRAPH_NETWORK} --network-file configs/${network}-networks-config.json --version-label ${SUBGRAPH_VERSION_LABEL} ${SUBGRAPH_NAME} \
    ;;
  create)
    echo "Creating subgraph on Fluence with name: $SUBGRAPH_NAME..."
    graph create --node ${GRAPHNODE_URL} ${SUBGRAPH_NAME}
    echo "${GRAPH_NODE_QUERY_URL}${SUBGRAPH_NAME}" >> ${SUBGRAPH_DEPLOYMENTS_DIR}/${network}.txt
    ;;
  remove)
    echo "Removing subgraph on Fluence with name: $SUBGRAPH_NAME..."
    graph remove --node ${GRAPHNODE_URL} ${SUBGRAPH_NAME}
    ;;
esac
