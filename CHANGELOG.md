# Changelog

## [4.0.1](https://github.com/dvsa/rsp-internal-portal/compare/v4.0.0...v4.0.1) (2024-08-30)


### Bug Fixes

* amend input length on vehiclereg input ([#177](https://github.com/dvsa/rsp-internal-portal/issues/177)) ([56432e4](https://github.com/dvsa/rsp-internal-portal/commit/56432e4b97012ef8c206e574edcbaf7867ff3b43))

## [4.0.0](https://github.com/dvsa/rsp-internal-portal/compare/v3.3.2...v4.0.0) (2024-08-16)


### Miscellaneous Chores

* release 4.0.0 ([e62227f](https://github.com/dvsa/rsp-internal-portal/commit/e62227fc808db9312ba72483e260f0c7d56499bf))

## [3.3.2](https://github.com/dvsa/rsp-internal-portal/compare/v3.3.1...v3.3.2) (2024-08-16)


### Bug Fixes

* release prompt to prep ([a569e1a](https://github.com/dvsa/rsp-internal-portal/commit/a569e1a1389ea6049e78d9b80afe40a6cddb36af))

## [3.3.1](https://github.com/dvsa/rsp-internal-portal/compare/v3.3.0...v3.3.1) (2024-08-16)


### Bug Fixes

* release prompt to prep ([a569e1a](https://github.com/dvsa/rsp-internal-portal/commit/a569e1a1389ea6049e78d9b80afe40a6cddb36af))

## [3.3.0](https://github.com/dvsa/rsp-internal-portal/compare/v3.2.0...v3.3.0) (2023-03-13)


### Features

* Refactor and fix auth errors ([#161](https://github.com/dvsa/rsp-internal-portal/issues/161)) ([5f428ff](https://github.com/dvsa/rsp-internal-portal/commit/5f428ffcaefa5506fa0c1d9c886ed1c2f7987128))

## [3.2.0](https://github.com/dvsa/rsp-internal-portal/compare/v3.1.1...v3.2.0) (2023-03-02)


### Features

* New env var to allow payment for overdue payments ([#157](https://github.com/dvsa/rsp-internal-portal/issues/157)) ([b231744](https://github.com/dvsa/rsp-internal-portal/commit/b231744911fb248eee5de88652147b84896faf4d))
* Restrict CSP for self and assets urls only ([#160](https://github.com/dvsa/rsp-internal-portal/issues/160)) ([f430694](https://github.com/dvsa/rsp-internal-portal/commit/f43069465deed93ba2bb39cbd7cd0d627e2738cf))


### Bug Fixes

* Add user role to error log for debugging ([#156](https://github.com/dvsa/rsp-internal-portal/issues/156)) ([46fd53d](https://github.com/dvsa/rsp-internal-portal/commit/46fd53d77d72c3b82c501a20fec1d80cdccc2082))
* Updated group payment logging ([#159](https://github.com/dvsa/rsp-internal-portal/issues/159)) ([e0bc1d1](https://github.com/dvsa/rsp-internal-portal/commit/e0bc1d1a9ae3dd99354133560d9ee8165b4517ac))

## [3.1.1](https://github.com/dvsa/rsp-internal-portal/compare/v3.1.0...v3.1.1) (2023-02-23)


### Bug Fixes

* Allow all on CSP to fix prod issue ([#154](https://github.com/dvsa/rsp-internal-portal/issues/154)) ([163d539](https://github.com/dvsa/rsp-internal-portal/commit/163d5393c6a996d9cdaae47348d292aeaa128aa8))

## [3.1.0](https://github.com/dvsa/rsp-internal-portal/compare/v3.0.0...v3.1.0) (2023-02-22)


### Features

* Added data-testid around unable to reverse payment message ([#147](https://github.com/dvsa/rsp-internal-portal/issues/147)) ([26c9d60](https://github.com/dvsa/rsp-internal-portal/commit/26c9d6071ceb37fad47bdb649a67805b9efd8883))
* added function to check if payments can be reversed ([#142](https://github.com/dvsa/rsp-internal-portal/issues/142)) ([551fdc9](https://github.com/dvsa/rsp-internal-portal/commit/551fdc940296d33a2de3812e8314fc0587e32d65))
* added Pay another penalty button to group payments ([#149](https://github.com/dvsa/rsp-internal-portal/issues/149)) ([816f31a](https://github.com/dvsa/rsp-internal-portal/commit/816f31a2b5252c70a24c539321c2481d5e7b0697))


### Bug Fixes

* allow certain payment types to be reversed on the same day ([#145](https://github.com/dvsa/rsp-internal-portal/issues/145)) ([dec2dd0](https://github.com/dvsa/rsp-internal-portal/commit/dec2dd0dae5f7175fdfe3e9463fe0105b8970bf7))
* Payment Type Postal Order missing for reversing group payments ([#146](https://github.com/dvsa/rsp-internal-portal/issues/146)) ([894ff9b](https://github.com/dvsa/rsp-internal-portal/commit/894ff9bea7e4366ecaf271813ca6b0762ea4572b))
* The S3 bucket path for the release webhook.  ([#151](https://github.com/dvsa/rsp-internal-portal/issues/151)) ([5d84891](https://github.com/dvsa/rsp-internal-portal/commit/5d84891d416fd0c33b65451a84f77c75432a8daa))
