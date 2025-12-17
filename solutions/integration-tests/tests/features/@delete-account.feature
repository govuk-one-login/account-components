Feature: Delete account

  Scenario: Successfully delete account
    Given I go to the journey initiator
    And I begin a "account-delete" journey
    Then the page title is prefixed with "TODO introduction"

    Given I click the "TODO continue" button
    Then the page title is prefixed with "TODO verifyEmailAddress"

    Given I click the "TODO resendCode" link
    Then the page title is prefixed with "TODO resendEmailVerificationCode"

    Given I click the "TODO resend" button
    Then the page title is prefixed with "TODO verifyEmailAddress"

    Given I click the "TODO resendCode" link
    Then the page title is prefixed with "TODO resendEmailVerificationCode"

    Given I click the "TODO verifyCode" link
    Then the page title is prefixed with "TODO verifyEmailAddress"
    And the page contains the text "someone@example.com"

    Given I enter the correct verification code
    And I click the "TODO verify" button
    Then the page title is prefixed with "TODO enterPassword"

    Given I enter my password
    And I click the "TODO continue" button
    Then the page title is prefixed with "TODO confirm"

    Given I click the "TODO delete account" button
    Then the page contains the text "Client callback"
    And the page contains the text '"accountDeleted": true'
    And the page contains the text '"sub": "urn:fdc:gov.uk:default"'
    And the page contains the text '"scope": "account-delete"'