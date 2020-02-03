export as namespace StateConfig;

export interface Links {
    [key: string]: string;
}

export interface SuperState {
    id: string;
    links: Links;
    entrySubState: string;
}

export interface State {
    id: string;
    links: Links;
    entryPoint?: boolean;
    turboSkip?: boolean;
    cascadeSkip?: boolean;
}

export interface Decision {
    id: string;
    concrete: string;
    links: Links;
}

export interface StateConfig {
    superStates: SuperState[];
    states: State[];
    decisions: Decision[];
}
