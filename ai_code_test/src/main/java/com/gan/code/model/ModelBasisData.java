package com.gan.code.model;

import lombok.Data;
import lombok.experimental.Accessors;

@Data
@Accessors(chain = true)
public class ModelBasisData {
    private String id;
    private String name;
    private String description;
    private String type;
    private TernaryNumber position;
    private TernaryNumber scale;
    private TernaryNumber rotation;
    private String status;
    private boolean visible;
}
