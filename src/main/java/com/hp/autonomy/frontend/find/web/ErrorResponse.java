/*
 * Copyright 2014-2015 Hewlett-Packard Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

package com.hp.autonomy.frontend.find.web;

import java.util.UUID;
import lombok.EqualsAndHashCode;
import lombok.Getter;

@Getter
@EqualsAndHashCode
class ErrorResponse {

    private final UUID uuid = UUID.randomUUID();
    private final String message;

    public ErrorResponse(final String message) {
        this.message = message;
    }

}