# Update testing

Sometimes it might be necessary to test the update flow of the desktop application. This document
will attempt to describe how to do so in detail.

The desktop applications are published to our GitHub page, which we can’t really do for development
purposes. To provide a fairly similar environment, we run a local S3 simulator which lets us
simulate a S3 provider environment.

While this is not identical to our scenarios it will still allow us to test the UI and updating
process without messing around in a GitHub repo.

## Preparation

1.  Start the minio docker container using `docker compose up` in `scripts/dev`.
2.  Add a read-only bucket called `update`, by going to `http://localhost:9001` and login using
    `minioadmin/minioadmin`, click `Create bucket` fill in the details.

    ![](./minio-create-bucket.png)

3.  Click on the bucket then `Anonymous`, `Add Access Rule` and fill in the following details.

    ![](./minio-access-rule.png)

4.  Modify the `electron-builder.json` with the following `publish` settings.

    ```json
    "publish" : {
        "provider": "s3",
        "endpoint": "http://127.0.0.1:9000",
        "bucket": "update"
    },
    ```

5.  Create `.aws/credentials` inside the Users home directory (Windows: C:\Users\username, Linux:
    ~/) with the following content

    ```bash
    [default]
    aws_access_key_id=minioadmin
    aws_secret_access_key=minioadmin
    ```

## Update

1.  Generate a local build using `npm run publish:win:dev`
2.  Install the build within `dist/nsis-web/Bitwarden-Installer-1.32.0.exe`
3.  Update the version number in `src/package.json`
4.  Publish the new version using: `npm run publish:win:dev`
5.  The app should now prompt for an update.

Note: This can also be done on Mac and Linux, just use `npm run publish:mac` and
`npm run publish:lin` for steps 1 and 4.

## Troubleshooting

### Issues when running the publishing command

If the publish command returns errors when uploading the artifacts, ensure the credentials were
created successfully as mentioned in step 5 of the preparation section. If the problem persists,
some other application on your system might have reserved port `9000` <Bitwarden>(On MacOS, ZScaler
tends to reserve ports in this range)</Bitwarden>. You can use the following command on UNIX systems
to check if this port is in use as well:

```sh
sudo lsof -nP -iTCP -sTCP:LISTEN | grep 9000
```

If that's the case you should update the port to a different value, for example `9002`:

- Update the `endpoint` URL in `electron-builder.json` to `http://127.0.0.1:9002`
- Update the `ports` section in the `scripts/dev/docker-compose.yml` file and replace the first line
  by ` - "9002:9000"`, then restart the docker container

Related:
[https://www.electron.build/tutorials/test-update-on-s3-locally](https://www.electron.build/tutorials/test-update-on-s3-locally)
