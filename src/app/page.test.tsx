import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import Home from './page';
import { ToastProvider } from '@/components/toast/toast-provider';
import { PreferencesProvider } from '@/lib/preferences';
import { testA11y } from '@/test-utils/a11y';
import userEvent from '@testing-library/user-event';
import { safeStorage } from '@/lib/safeStorage';


const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <PreferencesProvider>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </PreferencesProvider>
  );
};

describe('Home', () => {
  beforeEach(() => {
    safeStorage.resetCache();
    window.localStorage.clear();
  });
  it('renders TalentTrust heading as h2 (not h1, since layout provides header)', () => {
    renderWithProviders(<Home />);
    const heading = screen.getByRole('heading', { name: /TalentTrust/i });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H2');
  });

  it('renders description paragraph', () => {
    renderWithProviders(<Home />);
    expect(screen.getByText(/Decentralized Freelancer Escrow Protocol/i)).toBeInTheDocument();
  });

  it('has no nested main landmark in page component (layout provides the single main)', () => {
    const { container } = renderWithProviders(<Home />);
    // The Home component itself should not render a <main> element
    // The layout provides the single <main id="main-content"> landmark
    const pageContent = container.querySelector('div'); // The root div of Home component
    expect(pageContent?.querySelector('main')).not.toBeInTheDocument();
  });

  it('has no h1 in the page component (layout header provides the page title)', () => {
    const { container } = renderWithProviders(<Home />);
    // The page component should not render an h1
    const pageContent = container.querySelector('div'); // The root div of Home component
    expect(pageContent?.querySelector('h1')).not.toBeInTheDocument();
    // It should have an h2 instead
    expect(pageContent?.querySelector('h2')).toBeInTheDocument();
  });

  it('displays validation errors on empty submission', () => {
    renderWithProviders(<Home />);
    
    // Submit form empty
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    // Check that ErrorSummary and error messages are rendered
    expect(screen.getByRole('alert', { name: /There is a problem/i })).toBeInTheDocument();
    expect(screen.getAllByText('Email is required')).toHaveLength(2);
    expect(screen.getAllByText('Password is required')).toHaveLength(2);
  });

  it('displays specific validation error for invalid email and short password', () => {
    renderWithProviders(<Home />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(screen.getAllByText('Email must be valid')).toHaveLength(2);
    expect(screen.getAllByText('Password must be at least 8 characters')).toHaveLength(2);
  });

  it('shows success toast on valid submission', () => {
    renderWithProviders(<Home />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    // Check that toast notification is triggered and rendered in ToastViewport
    expect(screen.getByRole('status')).toHaveTextContent('Form submitted successfully!');
  });

  it('has no accessibility violations on render (empty state)', async () => {
    const { container } = renderWithProviders(<Home />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when errors are displayed', async () => {
    const { container } = renderWithProviders(<Home />);
    
    // Submit form empty to trigger errors
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with valid form data', async () => {
    const { container } = renderWithProviders(<Home />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('focuses the error summary when errors appear', () => {
    renderWithProviders(<Home />);
    
    // Submit form empty to trigger errors
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    const errorSummary = screen.getByRole('alert', { name: /There is a problem/i });
    expect(errorSummary).toBeInTheDocument();
    
    // The ErrorSummary element should have received focus via ref
    expect(errorSummary).toHaveFocus();
  });

  it('error summary anchors correctly target form field ids', () => {
    renderWithProviders(<Home />);
    
    // Submit form empty to trigger errors
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    const errorSummary = screen.getByRole('alert', { name: /There is a problem/i });
    const errorLinks = errorSummary.querySelectorAll('a');
    
    // Should have links for email and password errors
    expect(errorLinks.length).toBeGreaterThan(0);
    
    // Check that links point to correct field ids
    errorLinks.forEach(link => {
      const href = link.getAttribute('href');
      expect(href).toMatch(/^#(email|password)$/);
      
      // Verify the target element exists
      const fieldId = href?.substring(1); // Remove the #
      const targetElement = document.getElementById(fieldId || '');
      expect(targetElement).toBeInTheDocument();
    });
  });

  it('has inputs that are properly labelled and described by error elements when errors occur', () => {
    renderWithProviders(<Home />);
    
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();

    // Trigger validation errors
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    // Check aria-describedby and aria-invalid on inputs
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

    const emailError = screen.getAllByText('Email is required').find(
      (el) => el.id === 'email-error'
    );
    expect(emailError).toBeInTheDocument();

    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');

    const passwordError = screen.getAllByText('Password is required').find(
      (el) => el.id === 'password-error'
    );
    expect(passwordError).toBeInTheDocument();
  });

  it('uses testA11y helper for empty state', async () => {
    await testA11y(
      <PreferencesProvider>
        <ToastProvider>
          <Home />
        </ToastProvider>
      </PreferencesProvider>
    );
  });

  it('uses testA11y helper for error state', async () => {
    const view = renderWithProviders(<Home />);
    
    // Submit form empty to trigger errors
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    
    const results = await axe(view.container);
    expect(results).toHaveNoViolations();
  });

   it('uses noValidate so browser validation does not bypass JS validation', () => {
    renderWithProviders(<Home />);

    const form = screen
      .getByRole('button', { name: /sign in/i })
      .closest('form');

    expect(form).toHaveAttribute('novalidate');
  });

  it('shows error summary and field-level validation errors on empty submit', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Home />);

    await user.click(
      screen.getByRole('button', { name: /sign in/i }),
    );

    const errorSummary = screen.getByText(
    /there is a problem/i
  ).closest('[role="alert"]');

  expect(errorSummary).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    expect(passwordInput).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    expect(emailInput).toHaveAttribute(
      'aria-describedby',
      'email-error',
    );

    expect(passwordInput).toHaveAttribute(
      'aria-describedby',
      'password-error',
    );

    expect(
      document.getElementById('email-error'),
    ).toBeInTheDocument();

    expect(
      document.getElementById('password-error'),
    ).toBeInTheDocument();
  });

    it('maps validation errors to the correct FormField instances', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Home />);

    await user.type(
      screen.getByLabelText(/email/i),
      'invalid-email',
    );

    await user.type(
      screen.getByLabelText(/password/i),
      '123',
    );

    await user.click(
      screen.getByRole('button', { name: /sign in/i }),
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    const emailErrorId =
      emailInput.getAttribute('aria-describedby');

    const passwordErrorId =
      passwordInput.getAttribute('aria-describedby');

    expect(emailErrorId).toBe('email-error');
    expect(passwordErrorId).toBe('password-error');

    const emailError = document.getElementById(
      emailErrorId!,
    );

    const passwordError = document.getElementById(
      passwordErrorId!,
    );

    expect(emailError?.textContent?.length).toBeGreaterThan(
      0,
    );

    expect(
      passwordError?.textContent?.length,
    ).toBeGreaterThan(0);

    expect(emailError?.textContent).not.toEqual(
      passwordError?.textContent,
    );
  });


    it('submits successfully and displays toast feedback for valid input', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Home />);

    await user.type(
      screen.getByLabelText(/email/i),
      'user@example.com',
    );

    await user.type(
      screen.getByLabelText(/password/i),
      'password123',
    );

    await user.click(
      screen.getByRole('button', { name: /sign in/i }),
    );

    expect(
      screen.queryByRole('alert'),
    ).not.toBeInTheDocument();

    const toast = screen.getByRole('status');

    expect(toast).toBeInTheDocument();

    expect(
      within(toast).getByText(
        /submitted successfully/i,
      ),
    ).toBeInTheDocument();
  });

  it('keeps inputs correctly labelled after validation state changes', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Home />);

    await user.click(
      screen.getByRole('button', { name: /sign in/i }),
    );

    expect(
      screen.getByLabelText(/email/i),
    ).toBeVisible();

    expect(
      screen.getByLabelText(/password/i),
    ).toBeVisible();
  });

  /**
   * --- SUCCESS PATH BRANCHING ---
   *
   * Covers the branch in handleSubmit where newErrors.length === 0:
   * showSuccess() is called, the success toast is rendered, and the
   * ErrorSummary is absent from the DOM.
   *
   * Complexity: O(1) per assertion — each query is a single DOM traversal.
   */
  describe('submit branching — success path', () => {
    /**
     * Asserts that a valid form submission produces a success toast rendered
     * with role="status" and the expected title text.
     *
     * Branch covered: handleSubmit → newErrors.length === 0 → showSuccess()
     */
    it('renders a role="status" success toast with the expected title on valid submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const toast = screen.getByRole('status');
      expect(toast).toBeInTheDocument();
      expect(within(toast).getByText(/form submitted successfully/i)).toBeInTheDocument();
    });

    /**
     * Asserts that no ErrorSummary (role="alert" / aria-labelledby="error-summary-title")
     * is present after a valid submission, confirming the success branch
     * does not populate the errors state.
     *
     * Branch covered: handleSubmit → newErrors.length === 0 → setErrors([])
     */
    it('does not render ErrorSummary on valid submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(
        screen.queryByRole('alert', { name: /there is a problem/i }),
      ).not.toBeInTheDocument();
    });

    /**
     * Asserts the ToastAnnouncer's aria-live="polite" sr-only region receives
     * the success toast title so screen readers can announce it when idle.
     *
     * Branch covered: ToastAnnouncer → latestSuccess.title rendered in polite live region
     */
    it('populates the aria-live="polite" announcer with the success title', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // There are multiple aria-live="polite" regions (ToastAnnouncer + form announcer).
      // The ToastAnnouncer updates synchronously; find the one that has the success title.
      const politeRegions = document.querySelectorAll('[aria-live="polite"]');
      const populatedRegion = Array.from(politeRegions).find(
        (el) => /form submitted successfully/i.test(el.textContent ?? ''),
      );
      expect(populatedRegion).toBeInTheDocument();
      expect(populatedRegion?.textContent).toMatch(/form submitted successfully/i);
    });
  });

  /**
   * --- EMAIL-ONLY ERROR PATH ---
   *
   * Covers the branch where email is empty but password passes all validation
   * rules. Asserts that error isolation is correct: only the email fieldId
   * receives a ValidationError from validateLogin, so only the email field
   * is marked invalid and only the email error appears in ErrorSummary.
   *
   * Complexity: O(n) per render where n = number of DOM nodes — constant for
   * this fixed-size form.
   */
  describe('submit branching — email-only error path', () => {
    /**
     * Asserts the email error link appears in ErrorSummary when email is
     * empty and password satisfies the minimum-length rule.
     *
     * Branch covered: validateLogin → !email → push({ fieldId:'email', message:'Email is required' })
     */
    it('shows only the email error in ErrorSummary when email is missing and password is valid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const summary = screen.getByRole('alert', { name: /there is a problem/i });
      expect(summary).toBeInTheDocument();
      expect(
        within(summary).getByRole('link', { name: /email is required/i }),
      ).toBeInTheDocument();
    });

    /**
     * Asserts no password error appears in ErrorSummary when only the email
     * field is invalid — confirms getError('password') returns undefined and
     * ErrorSummary only lists the errors array entries it receives.
     */
    it('does not show a password error in ErrorSummary when only email is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const summary = screen.getByRole('alert', { name: /there is a problem/i });
      expect(within(summary).queryByRole('link', { name: /password/i })).not.toBeInTheDocument();
    });

    /**
     * Asserts per-field ARIA state is scoped correctly:
     * - email input: aria-invalid="true"  (has a ValidationError)
     * - password input: aria-invalid="false" (no ValidationError for this field)
     *
     * Validates that getError wires aria-invalid independently per fieldId.
     */
    it('marks only the email input aria-invalid when email is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-invalid', 'false');
    });

    /**
     * Asserts getError('email') produces the exact "Email is required" string
     * in the inline FormField error paragraph (id="email-error"), which is the
     * element linked by aria-describedby on the email input.
     */
    it('renders the exact "Email is required" message in the email field inline error', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const inlineError = document.getElementById('email-error');
      expect(inlineError).toBeInTheDocument();
      expect(inlineError?.textContent).toBe('Email is required');
    });
  });

  /**
   * --- PASSWORD-ONLY ERROR PATH ---
   *
   * Covers the branch where password is empty but email passes format
   * validation. Mirrors the email-only path to confirm symmetric error
   * isolation: only the password fieldId receives a ValidationError.
   *
   * Complexity: O(1) per assertion — same fixed-size DOM as above.
   */
  describe('submit branching — password-only error path', () => {
    /**
     * Asserts the password error link appears in ErrorSummary when password
     * is empty and email satisfies the format rule.
     *
     * Branch covered: validateLogin → !password → push({ fieldId:'password', message:'Password is required' })
     */
    it('shows only the password error in ErrorSummary when password is missing and email is valid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const summary = screen.getByRole('alert', { name: /there is a problem/i });
      expect(summary).toBeInTheDocument();
      expect(
        within(summary).getByRole('link', { name: /password is required/i }),
      ).toBeInTheDocument();
    });

    /**
     * Asserts no email error appears in ErrorSummary when only the password
     * field is invalid — confirms getError('email') returns undefined and
     * the ErrorSummary list omits unrelated field errors.
     */
    it('does not show an email error in ErrorSummary when only password is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const summary = screen.getByRole('alert', { name: /there is a problem/i });
      expect(within(summary).queryByRole('link', { name: /email/i })).not.toBeInTheDocument();
    });

    /**
     * Asserts per-field ARIA state is scoped correctly:
     * - password input: aria-invalid="true"  (has a ValidationError)
     * - email input:    aria-invalid="false" (no ValidationError for this field)
     */
    it('marks only the password input aria-invalid when password is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'false');
    });

    /**
     * Asserts getError('password') produces the exact "Password is required"
     * string in the inline FormField error paragraph (id="password-error").
     */
    it('renders the exact "Password is required" message in the password field inline error', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const inlineError = document.getElementById('password-error');
      expect(inlineError).toBeInTheDocument();
      expect(inlineError?.textContent).toBe('Password is required');
    });
  });

  /**
   * --- GETTERROR FIELD MAPPING — FORMAT VALIDATION ---
   *
   * Covers the secondary branches of validateLogin (present-but-invalid input)
   * and asserts that getError maps each fieldId to the exact message string
   * defined in validateLogin.ts. This pins the contract between the validator
   * and the rendered UI against future message string changes.
   *
   * Complexity: O(1) — single getElementById lookup per assertion.
   */
  describe('getError field mapping — format validation', () => {
    /**
     * Asserts that an email address lacking '@' triggers validateLogin's
     * format branch and the exact message "Email must be valid" is rendered
     * in the email FormField's inline error element (id="email-error").
     *
     * Branch covered: validateLogin → !email.includes('@') → 'Email must be valid'
     */
    it('renders "Email must be valid" inline when email lacks @', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'notanemail');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const inlineError = document.getElementById('email-error');
      expect(inlineError).toBeInTheDocument();
      expect(inlineError?.textContent).toBe('Email must be valid');
    });

    /**
     * Asserts that a password shorter than 8 characters triggers validateLogin's
     * length branch and the exact message "Password must be at least 8 characters"
     * appears in the password FormField's inline error (id="password-error").
     *
     * Branch covered: validateLogin → password.length < 8 → 'Password must be at least 8 characters'
     */
    it('renders "Password must be at least 8 characters" inline when password is too short', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/password/i), 'short');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const inlineError = document.getElementById('password-error');
      expect(inlineError).toBeInTheDocument();
      expect(inlineError?.textContent).toBe('Password must be at least 8 characters');
    });
  });

  /**
   * --- FORM ANNOUNCER LIVE-REGION INTEGRATION TESTS ---
   *
   * Verifies that the `useFormAnnouncer` live regions are rendered in the
   * form and that they carry the correct ARIA attributes and content after
   * successful / failed submission.
   *
   * These tests complement the hook unit tests in
   * src/hooks/__tests__/useFormAnnouncer.test.ts.
   */
  describe('form announcer live regions', () => {
    it('renders the polite live region in the form (data-testid="form-announcer-polite")', () => {
      renderWithProviders(<Home />);
      const region = screen.getByTestId('form-announcer-polite');
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-live', 'polite');
      expect(region).toHaveAttribute('aria-atomic', 'true');
    });

    it('renders the assertive live region in the form (data-testid="form-announcer-assertive")', () => {
      renderWithProviders(<Home />);
      const region = screen.getByTestId('form-announcer-assertive');
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-live', 'assertive');
      expect(region).toHaveAttribute('aria-atomic', 'true');
    });

    it('both live regions are visually hidden (sr-only) — no visual change', () => {
      renderWithProviders(<Home />);

      const polite = screen.getByTestId('form-announcer-polite');
      const assertive = screen.getByTestId('form-announcer-assertive');

      // sr-only is the Tailwind utility for visually-hidden elements.
      expect(polite).toHaveClass('sr-only');
      expect(assertive).toHaveClass('sr-only');
    });

    it('polite live region is empty on initial render', () => {
      renderWithProviders(<Home />);
      const polite = screen.getByTestId('form-announcer-polite');
      expect(polite.textContent).toBe('');
    });

    it('assertive live region is empty on initial render', () => {
      renderWithProviders(<Home />);
      const assertive = screen.getByTestId('form-announcer-assertive');
      expect(assertive.textContent).toBe('');
    });

    it('populates the polite live region after a successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Debounce is 300 ms — waitFor polls until the region is populated.
      await waitFor(() => {
        const polite = screen.getByTestId('form-announcer-polite');
        expect(polite.textContent).toMatch(/form submitted successfully/i);
      }, { timeout: 1000 });
    });

    it('keeps the assertive live region empty after a successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for debounce to fire.
      await waitFor(() => {
        const polite = screen.getByTestId('form-announcer-polite');
        expect(polite.textContent).toMatch(/form submitted successfully/i);
      }, { timeout: 1000 });

      const assertive = screen.getByTestId('form-announcer-assertive');
      expect(assertive.textContent).toBe('');
    });

    it('populates the assertive live region after a failed submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      // Submit with empty fields to trigger validation errors.
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        const assertive = screen.getByTestId('form-announcer-assertive');
        expect(assertive.textContent).toMatch(/sign in failed/i);
      }, { timeout: 1000 });
    });

    it('keeps the polite live region empty after a failed submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for debounce to fire, then assert polite is still empty.
      await waitFor(() => {
        const assertive = screen.getByTestId('form-announcer-assertive');
        expect(assertive.textContent).toMatch(/sign in failed/i);
      }, { timeout: 1000 });

      const polite = screen.getByTestId('form-announcer-polite');
      expect(polite.textContent).toBe('');
    });

    it('assertive error message mentions the number of errors', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Home />);

      // Both fields empty → 2 errors.
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        const assertive = screen.getByTestId('form-announcer-assertive');
        expect(assertive.textContent).toMatch(/2 error/i);
      }, { timeout: 1000 });
    });

    it('has no accessibility violations with live regions present (empty state)', async () => {
      const { container } = renderWithProviders(<Home />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations after a successful submission with live region populated', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<Home />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations after a failed submission with assertive region populated', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<Home />);

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

});
