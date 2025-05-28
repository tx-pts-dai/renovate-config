# renovate-config

Central repository for Renovate configuration files.


## Example Usage
```renovate.json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "github>tx-pts-dai/renovate-config"
  ]
}
```

## Developing Custom Configurations



### Regex Manager

Renovate supports the ECMAScript (JavaScript) flavor of regex.

https://docs.renovatebot.com/modules/manager/regex/

#### Test tool and escaping

https://docs.renovatebot.com/modules/manager/regex/#online-regex-testing-tool-tips

## Exclude rules

*exclude.json* is meant to store configuration for disabling renovate PRs for specific managers on specific repositories or packages.

## Contribute

Run *pre-commt run -a* before any commit
