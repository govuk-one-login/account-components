@skipMobile
Feature: Journey state

  Scenario: Journey state navigation behaves as expected
    # Shouldn't be able to access any journey pages before starting journey
    Given I go to the "Testing journey - step 1" page   
    Then the page path is "Authorize error"
    And I go to the "Testing journey - enter password" page   
    Then the page path is "Authorize error"
    And I go to the "Testing journey - confirmation" page   
    Then the page path is "Authorize error"
  
    Given I go to the journey initiator
    And I begin a "testing-journey" journey
    Then the page title is prefixed with "Testing journey step 1"

    # Shouldn't be able to access the confirmation page
    Given I go to the "Testing journey - confirmation" page
    Then the page title is prefixed with "Testing journey step 1"

    Given I click the "Go to next step" button
    Then the page title is prefixed with "Testing journey enter password"

    # Shouldn't be able to access the confirmation page
    Given I go to the "Testing journey - confirmation" page    
    Then the page title is prefixed with "Testing journey step 1"

    Given I click the "Go to next step" button
    Then the page title is prefixed with "Testing journey enter password"

    Given I click the browser's back button
    Then the page title is prefixed with "Testing journey step 1"

    Given I click the "Go to next step" button
    Then the page title is prefixed with "Testing journey enter password"

    Given I click the "Submit" button
    Then the page title is prefixed with "Testing journey confirmation"

    # Shouldn't be able to access the enter password page
    Given I click the browser's back button
    Then the page title is prefixed with "Testing journey confirmation"

    # Shouldn't be able to access the step 1 page
    Given I go to the "Testing journey - step 1" page
    Then the page title is prefixed with "Testing journey confirmation"

    # Shouldn't be able to access the enter password page
    Given I go to the "Testing journey - enter password" page
    Then the page title is prefixed with "Testing journey confirmation"

    # Shouldn't be able to access any journey pages after finishing journey
    Given I click the "Complete testing journey" button
    And I go to the "Testing journey - step 1" page   
    Then the page path is "Authorize error"
    And I go to the "Testing journey - enter password" page   
    Then the page path is "Authorize error"
    And I go to the "Testing journey - confirmation" page   
    Then the page path is "Authorize error"    