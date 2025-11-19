Feature: Journey state

  @postDeploy
  Scenario: Journey state navigation behaves as expected
    Given I go to the journey initiator
    And I begin a "testing-journey" journey
    And the page has finished loading
    Then the page title is prefixed with "Testing journey step 1"
    Given I go to the "Testing journey - confirmation" page
    And the page has finished loading
    Then the page title is prefixed with "Testing journey step 1"
    Given I click the "Go to next step" button
    And the page has finished loading    
    Then the page title is prefixed with "Testing journey enter password"
    Given I go to the "Testing journey - confirmation" page    
    And the page has finished loading    
    Then the page title is prefixed with "Testing journey step 1"
    Given I click the "Go to next step" button
    And the page has finished loading    
    Then the page title is prefixed with "Testing journey enter password"
    Given I click the browser's back button
    And the page has finished loading    
    Then the page title is prefixed with "Testing journey step 1"
    Given I click the "Go to next step" button
    And the page has finished loading    
    Then the page title is prefixed with "Testing journey enter password"
    Given I click the "Submit" button
    And the page has finished loading    
    Then the page title is prefixed with "Testing journey confirmation"
    Given I click the browser's back button
    And the page has finished loading    
    Then the page title is prefixed with "Testing journey confirmation"
    Given I go to the "Testing journey - step 1" page
    And the page has finished loading    
    Then the page title is prefixed with "Testing journey confirmation"
    Given I go to the "Testing journey - enter password" page
    And the page has finished loading    
    Then the page title is prefixed with "Testing journey confirmation"
    Given I click the "Complete testing journey" button
    And the page has finished loading    
    And I go to the "Testing journey - step 1" page   
    And the page has finished loading    
    Then the page path is "Authorize error"
    And I go to the "Testing journey - enter password" page   
    And the page has finished loading    
    Then the page path is "Authorize error"
    And I go to the "Testing journey - confirmation" page  
    And the page has finished loading     
    Then the page path is "Authorize error"    