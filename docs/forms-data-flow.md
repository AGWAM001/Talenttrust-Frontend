# Forms Data-Flow

This document outlines the standard data-flow for forms in the TalentTrust frontend (e.g., login form, contract creation form). It covers how data is collected, validated, and rendered, ensuring consistent state management and accessibility.

## Data-Flow Diagram (Fetch → Transform → Render)

The following Mermaid diagram visualizes the lifecycle of form data within our components.

```mermaid
flowchart TD
    %% Input Layer (Fetch/Collect)
    subgraph Collect [1. Collect & State]
        UI([User Input]) --> |onChange| State[React Local State<br/>e.g., useState]
        State --> FormValues[(Raw Form Values)]
    end

    %% Transform & Validation Layer
    subgraph Transform [2. Transform & Validate]
        FormValues --> |onSubmit| Validation[Validation Logic<br/>e.g., validateLogin, validateForm]
        Validation --> Sanitize[Sanitization<br/>e.g., sanitizeUserText]
        Validation --> CustomCheck[Custom Rules<br/>e.g., isValidStellarAddress]
        
        Sanitize --> Decision{Are there errors?}
        CustomCheck --> Decision
    end

    %% Render & Output Layer
    subgraph Render [3. Render & Dispatch]
        Decision -- "Yes" --> UpdateErrorState[setErrors(ValidationErrors)]
        Decision -- "No" --> BuildDomain[Construct Domain Object<br/>e.g., Contract]
        
        UpdateErrorState --> UI_ErrorSummary[<ErrorSummary /><br/>role='alert' & auto-focus]
        UpdateErrorState --> UI_FormField[<FormField /><br/>aria-invalid='true']
        
        BuildDomain --> Callback[onSubmit Callback<br/>Propagate to parent/API]
        Callback --> ToastSuccess[useToast showSuccess]
        Callback --> ResetState[Clear Form State]
    end

    %% Dependencies
    classDef ui fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#0f172a
    classDef logic fill:#eff6ff,stroke:#bfdbfe,stroke-width:2px,color:#1e3a8a
    classDef error fill:#fef2f2,stroke:#fecaca,stroke-width:2px,color:#991b1b
    classDef success fill:#ecfdf5,stroke:#a7f3d0,stroke-width:2px,color:#065f46
    
    UI:::ui
    UI_ErrorSummary:::error
    UI_FormField:::error
    ToastSuccess:::success
    Validation:::logic
```

## Phase Breakdown

### 1. Collect (Fetch)
- Raw input is captured via `onChange` handlers and mapped directly into React local state (e.g., `useState`).
- Input is purposefully untrimmed at this stage to prevent UI jitter during typing.

### 2. Transform & Validate
- Triggered synchronously on form submission (`onSubmit`).
- Form values are passed to pure, isolated validation helpers (e.g., `validateLogin`, or `validateForm`).
- **Transformations**: Strings are trimmed and sanitized (e.g., `sanitizeUserText`).
- **Validations**: Formats and requirements are checked (e.g., `isValidStellarAddress`, length boundaries).
- Outputs an array of `ValidationError` objects containing `fieldId` and `message`.

### 3. Render
- **Failure Path**: 
  - The `errors` state is updated.
  - The `<ErrorSummary />` component renders the list of errors, announces them to screen readers (`role="alert"`), and sets focus.
  - Individual `<FormField />` wrappers associate errors with their respective inputs using `aria-invalid` and `aria-describedby`.
- **Success Path**: 
  - A domain object (e.g., `Contract`) is constructed and propagated upward.
  - Success feedback is delivered via the accessible `useToast` hook.
  - Form state is reset (if applicable).
