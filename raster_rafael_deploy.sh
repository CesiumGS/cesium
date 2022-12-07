
sudo docker pull acrarolibotnonprod.azurecr.io/tiles-splitter:v1.3.0 &&\
sudo docker tag acrarolibotnonprod.azurecr.io/tiles-splitter:v1.3.0 artifactory.rnd-hub.com:6543/tiles-splitter:v1.3.0 &&\
sudo docker push artifactory.rnd-hub.com:6543/tiles-splitter:v1.3.0 &&\


docker login artifactory.rnd-hub.com:6543 -u svc_imfamily@rnd-hub.com -password-stdin AKCp5em6SDzBdbGELRPV6ccE7fCc9vgw3Cswi6YY9bQCvtPPY7y7px9trKNwMAKZGgp2qQB26

# Pull images
docker pull acrarolibotnonprod.azurecr.io/tiles-splitter:v1.3.0
docker pull acrarolibotnonprod.azurecr.io/token-cli:v2.0.1

# Tag images

# push to new artifactory
