@skipMobile
Feature: CSRF protection

  Scenario: Submitting a form with an invalid CSRF token
    Given I go to the journey initiator
    And I begin a "testing-journey" journey
    Then the page title is prefixed with "Testing journey step 1"
    Given I tamper with the CSRF token and submit the form
    Then the page title is prefixed with "Sorry, there is a problem"
    And the response status code should be 403

  Scenario: Submitting a form with no CSRF token
    Given I go to the journey initiator
    And I begin a "testing-journey" journey
    Then the page title is prefixed with "Testing journey step 1"
    Given I remove the CSRF token and submit the form
    Then the page title is prefixed with "Sorry, there is a problem"
    And the response status code should be 403
