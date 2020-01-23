# MUSES HTTP API


## JWT RSA256 Key Management

### Generating the key

Classic RSA256 Key generation

```
    ssh-keygen -t rsa -b 4096 -m PEM -f private_key_filename
```

The public key auto-generated isn't supported by JWT, read more on [this issue on github](https://github.com/auth0/node-jsonwebtoken/issues/68#issuecomment-128114527

So we need to remove the auto-generated public key and generate a proper one

```
    rm -rf private_key_filename.pub
    openssl rsa -in private_key_filename -pubout -outform PEM -out public_key_output_filename
```

### Store & access the key

* Use AWS Secrets Manager to store your private key
* Use the secrets.json file to bind the name of this secret

### Fetch at runtime

Serverless integration with AWS Secrets Manager isn't flawless and secrets are read at deployment time in clear
For security concerns, the implementation relies on runtime fetching & lambda scope caching for pricing efficiency (AWS Secrets Manager isn't free)