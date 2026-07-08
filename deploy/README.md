# Deploying the Sakar Labs blog to Azure (Central India)

The blog runs as a Docker container (nginx serving the static build) on a small
Azure VM. Provisioning is done with the Azure CLI; first-boot setup is handled by
[`azure-cloud-init.yaml`](./azure-cloud-init.yaml).

## What gets created

| Resource | Value |
|---|---|
| Resource group | `sakarlabs-rg` |
| Region | `centralindia` (Pune) |
| VM | `sakarlabs-blog`, Ubuntu 22.04 |
| Size | `Standard_B2ts_v2` (2 vCPU, 1 GiB burstable) |
| Open ports | 22 (SSH), 80 (HTTP) |

> Note: `Standard_B1s` was the original pick but is capacity-restricted in Central
> India; `Standard_B2ts_v2` is the current cheap burstable equivalent.

## Provision (one time)

```bash
RG=sakarlabs-rg
LOC=centralindia
VM=sakarlabs-blog

az group create -n $RG -l $LOC

az vm create \
  -g $RG -n $VM \
  --image Ubuntu2204 \
  --size Standard_B2ts_v2 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --custom-data deploy/azure-cloud-init.yaml \
  --public-ip-sku Standard

az vm open-port -g $RG -n $VM --port 80 --priority 900
```

`cloud-init` then installs Docker, adds a 2 GB swapfile, clones the public repo to
`/opt/sakarlabs`, builds the image, and runs it on port 80. First boot takes a few
minutes; the site comes up at `http://<public-ip>/`.

Get the IP any time:

```bash
az vm show -g $RG -n $VM -d --query publicIps -o tsv
```

## Redeploy after new posts / changes

SSH in and rebuild from the latest `main`:

```bash
ssh azureuser@<public-ip>
cd /opt/sakarlabs
git pull
docker build -t sakarlabs-blog .
docker rm -f sakarlabs-blog
docker run -d -p 80:80 --restart unless-stopped --name sakarlabs-blog sakarlabs-blog
```

## Tear down (stops all billing for these resources)

```bash
az group delete -n sakarlabs-rg --yes --no-wait
```

## Follow-ups (not done yet)

- **TLS/HTTPS + domain:** point a domain's A record at the public IP, then put Caddy
  (automatic Let's Encrypt) or nginx + certbot in front. Until then the site is
  plain HTTP.
- **Auto-redeploy on push:** a GitHub Actions workflow could SSH in and run the
  redeploy steps on every push to `main`.
