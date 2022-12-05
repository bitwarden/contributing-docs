# Deploying Entity Framework

:::danger

Entity Framework is a largely untested way to provide database services for Bitwarden. If you decide
to use it, please expect inconsistencies and bugs. If you encounter any, please create an issue at
[https://github.com/bitwarden/server/issues](https://github.com/bitwarden/server/issues) with as
much reproduction information as possible.

We don’t yet have a way to automatically run database migrations. You need to do it yourself _every
time you update your Bitwarden instance_. It’s best not to run a given migration multiple times.
Again, this is not automated, so you’ll need to keep track yourself.

No attempt is made to migrate data from an existing MSSql database to a new database provider. You
can swap back to MSSql at any time by changing `globalSettings__databaseProvider="postgres"` to
`globalSettings__databaseProvider="sqlServer"`

**DO NOT in a production instance with data you care about!**

:::

:::info

These instructions have only been tested on Linux.

:::

## Instructions

1.  Install a Bitwarden self-hosted instance as nomal:
    [https://bitwarden.com/help/install-on-premise-linux/](https://bitwarden.com/help/install-on-premise-linux/)
2.  Update `bwdata/docker/docker-compose.override.yml`

    - Note: You should choose a better PgAdmin4 password

    ```dockerfile
    #
    # Useful references:
    # https://docs.docker.com/compose/compose-file/
    # https://docs.docker.com/compose/reference/overview/#use--f-to-specify-name-and-path-of-one-or-more-compose-files
    # https://docs.docker.com/compose/reference/envvars/
    #
    #########################################################################
    # WARNING: This file is generated. Do not make changes to this file.    #
    # They will be overwritten on update. If you want to make additions to  #
    # this file, you can create a `docker-compose.override.yml` file in the #
    # same directory and it will be merged into this file at runtime. You   #
    # can also manage various settings used in this file from the           #
    # ./bwdata/config.yml file for your installation.                       #
    #########################################################################

    version: '3'

    services:
      mssql:

      web:

      attachments:

      api:

      identity:

      sso:

      admin:

      icons:

      notifications:

      events:

      nginx:

      postgresql:
        image: postgres:13.2
        container_name: bitwarden-postgres
        restart: always
        stop_grace_period: 60s
        networks:
          - default
          - public
        ports:
          - '5432:5432'
        volumes:
          - ../postgres/data:/var/lib/postgresql/data
          - ../postgres/config:/etc/postgresql
          - ../postgres/log:/var/log/postgresql
        env_file:
          - postgresql.env
          - ../env/uid.env
          - ../env/postgresql.override.env

      pgadmin:
        image: dpage/pgadmin4
        environment:
          PGADMIN_DEFAULT_EMAIL: postgres@bitwarden.com
          PGADMIN_DEFAULT_PASSWORD: root
        ports:
          - "8889:80"
        networks:
          - default
          - public
    ```

3.  Create `bwdata/docker/postgresql.env`

    ```bash
    POSTGRES_DB=bw_vault
    POSTGRES_USER=postgres
    ```

4.  Create `bwdata/env/postgresql.override.env`

    - Note: you should choose a better password

    ```bash
    POSTGRES_PASSWORD=example
    ```

5.  Update `bwdata/env/global.override.env` by adding the following (be sure to update the password
    to match what you set in`postgresql.override.env`):

    ```bash
    globalSettings__databaseProvider="postgres"
    globalSettings__postgreSql__connectionString="Host=bitwarden-postgres;Port=5432;Username=postgres;Password=example;Database=bw_vault"
    ```

6.  Restart your Bitwarden environment to apply these config changes: `bitwarden.sh restart`
7.  Run database migrations. Since we’re just setting up, we need to run all migrations.

    1.  Clone the server repository `git clone https://github.com/bitwarden/server`
    2.  `cd` into the appropriate Scripts directory. For Postgres, this is
        `server/util/PostgresMigrations/Scripts`
    3.  Copy each migration to the postgres docker container and run it. The following script will
        do this for every migration in the current directory. Note: this script needs to be run from
        the current directory, otherwise the `$f` in the `docker exec` command will not point to the
        script file on the container.

        ```bash
        for f in `ls -v ./*.psql`; do docker cp $f bitwarden-postgres:/var/lib/postgresql/; docker exec -u 1001 bitwarden-postgres psql bw_vault postgres -f /var/lib/postgresql/$f; done;
        ```

8.  Run `bitwarden.sh restart` just to make sure everything is up to date

Your self-hosted instance should now be using postgres!
