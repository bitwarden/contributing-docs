import React from "react";
import { stringToColor } from "./colors";
import { Badge } from "./Badge";

export function ServerSettingInfo({
  type,
  defaultValue,
  fullName,
  relevantProjects,
  environments,
}: {
  type: string;
  defaultValue: string;
  fullName: string;
  relevantProjects: string[];
  environments: ("cloud" | "selfhost")[];
}): JSX.Element {
  return (
    <div className="tw-pb-4">
      {environmentsComponent(environments)}
      {type ? (
        <div>
          <span>
            <strong>Type: </strong>
          </span>
          <code>{type}</code>
        </div>
      ) : null}
      {defaultValue ? defaultValueComponent(defaultValue) : null}
      {fullName ? (
        <div>
          <span>
            <strong>Full name: </strong>
          </span>
          <code>{fullName}</code>
        </div>
      ) : null}
      {relevantProjects ? relevantProjectsComponent(relevantProjects) : null}
    </div>
  );
}

function environmentsComponent(
  environments: ("cloud" | "selfhost")[] = ["cloud", "selfhost"],
): JSX.Element {
  return (
    <div className="tw-flex">
      <span className="tw-pr-2 tw-whitespace-nowrap">
        <strong>Environments: </strong>
      </span>
      <div className="tw-flex tw-flex-wrap tw-gap-1 tw-pt-1">
        {environments.map((environment) => (
          <Badge key={environment} bgColor={stringToColor(environment)}>
            {environment}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function defaultValueComponent(defaultValue: string | [string, string][]): JSX.Element {
  if (Array.isArray(defaultValue)) {
    return (
      <div>
        <span>
          <strong>Default value: </strong>
        </span>
        <ul className="tw-mb-0.5">
          {defaultValue.map(([key, value]) => (
            <li key={key}>
              <span>
                <strong>{key}: </strong>
              </span>
              <code>{value}</code>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <span>
        <strong>Default value: </strong>
      </span>
      <code>{defaultValue}</code>
    </div>
  );
}

function relevantProjectsComponent(projectNames: string[] | string): JSX.Element {
  return (
    <div className="tw-flex">
      <span className="tw-pr-2 tw-whitespace-nowrap">
        <strong>Relevant projects:</strong>
      </span>
      {projectNames.length === 0 ? (
        <div>
          <span>
            <strong>Not used</strong>
          </span>
        </div>
      ) : Array.isArray(projectNames) ? (
        <div className="tw-flex tw-flex-wrap tw-gap-1 tw-pt-1">
          {projectNames.sort().map((projectName) => (
            <Badge key={projectName} bgColor={stringToColor(projectName)}>
              {projectName}
            </Badge>
          ))}
        </div>
      ) : (
        <div>
          <span>{projectNames}</span>
        </div>
      )}
    </div>
  );
}
